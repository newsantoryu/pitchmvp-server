# main.py — PitchMVP Transcription Server
# Transcreve áudio, detecta nota por palavra e entrega cifra para o cantor.
# Processamento assíncrono com polling (compatível com ngrok free 30s).

import logging
import os
import tempfile
import uuid

import requests
from pathlib import Path

from fastapi import BackgroundTasks, File, FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from faster_whisper import WhisperModel
from pydantic import BaseModel

from music_utils import match_notes as music_match_notes
from pitch_engine import extract_pitch

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="PitchMVP Transcription API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

logger.info("Carregando modelo large-v3...")
model = WhisperModel(
    "large-v3", device="cpu", compute_type="int8",
    cpu_threads=8, download_root=os.path.expanduser("~/.cache/whisper-models")
)
logger.info("Modelo pronto.")

jobs: dict = {}

INITIAL_PROMPT = "Song with repeated choruses. Transcribe every word including repeated sections exactly as sung."

TRANSCRIBE_PARAMS = dict(
    language="en",
    word_timestamps=True,
    vad_filter=False,
    beam_size=5,
    best_of=5,
    temperature=[0.0, 0.2, 0.4],
    condition_on_previous_text=True,
    initial_prompt=INITIAL_PROMPT,
    compression_ratio_threshold=2.8,
    no_speech_threshold=0.6,
    log_prob_threshold=-1.0,
    repetition_penalty=1.0,
)


def extract_words(segments):
    words = []
    for seg in segments:
        if seg.words:
            for w in seg.words:
                text = w.word.strip().strip(".,!?;:\"'()[]")
                if text:
                    words.append({
                        "text":  text,
                        "start": round(w.start, 3),
                        "end":   round(w.end, 3),
                        "note":  None,
                    })
    return words


def run_job(job_id: str, tmp_path: str, voice_gender: str = "auto"):
    try:
        # ── 1. Transcrição ────────────────────────────────────────────────
        jobs[job_id] = {"status": "transcribing", "progress": 10}
        logger.info(f"[{job_id}] Transcrevendo...")
        segments, info = model.transcribe(tmp_path, **TRANSCRIBE_PARAMS)
        words = extract_words(segments)
        logger.info(f"[{job_id}] {len(words)} palavras transcritas em {info.duration:.1f}s")

        # ── 2. Pitch — roda direto, sem ThreadPoolExecutor ──────────────────
        jobs[job_id] = {"status": "pitch", "progress": 80}
        logger.info(f"[{job_id}] Detectando pitch...")
        try:
            pitch_frames = extract_pitch(tmp_path, voice_gender=voice_gender)
            logger.info(f"[{job_id}] {len(pitch_frames)} frames de pitch")
            if pitch_frames:
                matched = music_match_notes(words, pitch_frames)
                for i, w in enumerate(words):
                    w["note"] = matched[i]["note"] if i < len(matched) else None
                com_nota = sum(1 for w in words if w.get("note"))
                logger.info(f"[{job_id}] {com_nota}/{len(words)} palavras com nota")
            else:
                logger.warning(f"[{job_id}] Pitch: nenhum frame — notas ficarão vazias")
        except Exception as pe:
            import traceback
            logger.error(f"[{job_id}] Pitch erro: {pe}\n{traceback.format_exc()}")

        # ── 3. Resultado ──────────────────────────────────────────────────
        jobs[job_id] = {
            "status": "done",
            "progress": 100,
            "result": {
                "words": words,
                "language": info.language,
                "duration": round(info.duration, 2),
            }
        }
        logger.info(f"[{job_id}] Job concluído.")
    except Exception as e:
        logger.error(f"[{job_id}] Erro fatal: {e}")
        jobs[job_id] = {"status": "error", "message": str(e)}
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


class TranscribeRequest(BaseModel):
    audio_url:    str
    anon_key:     str
    voice_gender: str = "auto"   # "male" | "female" | "auto"

# Diretório do main.py (para servir o HTML)
_HTML_DIR = Path(__file__).resolve().parent


@app.get("/", response_class=HTMLResponse)
def index():
    """Serve a interface web PitchMVP (upload, URL, microfone, cifra)."""
    html_path = _HTML_DIR / "pitchmvp_web.html"
    if not html_path.exists():
        raise HTTPException(status_code=404, detail="pitchmvp_web.html não encontrado")
    return HTMLResponse(content=html_path.read_text(encoding="utf-8"))


@app.get("/health")
def health():
    return {"status": "ok", "model": "large-v3"}

@app.get("/job/{job_id}")
def get_job(job_id: str):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado.")
    # Remove da memória quando buscado com sucesso
    if job["status"] == "done":
        result = jobs.pop(job_id)
        return result
    return job

@app.post("/transcribe")
async def transcribe(req: TranscribeRequest, bg: BackgroundTasks):
    audio_url = req.audio_url.strip()
    if not audio_url.startswith("https://"):
        raise HTTPException(status_code=400, detail="audio_url deve ser HTTPS.")
    ext = os.path.splitext(audio_url.split("?")[0])[1].lower() or ".wav"
    headers = {"Authorization": f"Bearer {req.anon_key}", "apikey": req.anon_key}
    try:
        resp = requests.get(audio_url, headers=headers, timeout=60)
        resp.raise_for_status()
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Falha ao baixar: {e}")
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(resp.content)
        tmp_path = tmp.name
    job_id = str(uuid.uuid4())[:8]
    jobs[job_id] = {"status": "queued", "progress": 5}
    bg.add_task(run_job, job_id, tmp_path, req.voice_gender)
    return {"job_id": job_id}

@app.post("/transcribe-file")
async def transcribe_file(
    file: UploadFile = File(...),
    voice_gender: str = "auto",
    bg: BackgroundTasks = None,  # injetado pelo FastAPI
):
    ext = os.path.splitext(file.filename or "")[1].lower() or ".wav"
    content = await file.read()
    logger.info(f"Upload: {file.filename} ({len(content)/1024:.1f} KB)")
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name
    job_id = str(uuid.uuid4())[:8]
    jobs[job_id] = {"status": "queued", "progress": 5}
    bg.add_task(run_job, job_id, tmp_path, voice_gender)
    return {"job_id": job_id}