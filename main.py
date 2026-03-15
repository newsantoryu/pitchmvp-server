# main.py — PitchMVP Transcription Server
# Transcreve áudio, detecta nota por palavra e entrega cifra para o cantor.
# Processamento assíncrono com polling (compatível com ngrok free 30s).
from music_utils import detect_range
import logging
import os
import tempfile
import uuid

import requests
from pathlib import Path

from fastapi import BackgroundTasks, File, Form, FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from faster_whisper import WhisperModel
from pydantic import BaseModel

from music_utils import match_notes as music_match_notes
from pitch_engine import extract_pitch

from database import engine, SessionLocal
from models import Base, Score

Base.metadata.create_all(bind=engine)

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

# language é sobrescrito por request (en | pt)
TRANSCRIBE_PARAMS_BASE = dict(
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
# Default; em run_job usamos TRANSCRIBE_PARAMS_BASE + language do request


def _clean_word(text: str) -> str:
    return text.strip().strip(".,!?;:\"'()[]")


def extract_words(segments):
    """
    Extrai palavras dos segmentos do Whisper.
    Se segment.words existir, usa os timestamps por palavra.
    Senão (comum em áudios longos/ruidosos), faz fallback: divide segment.text
    e distribui o tempo entre seg.start e seg.end para não perder conteúdo.
    """
    words = []
    for seg in segments:
        if seg.words:
            for w in seg.words:
                text = _clean_word(w.word)
                if text:
                    words.append({
                        "text": text,
                        "start": round(w.start, 3),
                        "end": round(w.end, 3),
                        "note": None,
                    })
        elif getattr(seg, "text", None) and seg.text.strip():
            # Fallback: sem word-level timestamps (áudio longo, ruído, etc.)
            tokens = seg.text.strip().split()
            if not tokens:
                continue
            start = getattr(seg, "start", 0.0) or 0.0
            end = getattr(seg, "end", start) or start
            duration = max(end - start, 0.01)
            step = duration / len(tokens)
            for i, token in enumerate(tokens):
                text = _clean_word(token)
                if text:
                    t0 = start + i * step
                    t1 = start + (i + 1) * step
                    words.append({
                        "text": text,
                        "start": round(t0, 3),
                        "end": round(t1, 3),
                        "note": None,
                    })
    return words


def run_job(
    job_id: str,
    tmp_path: str,
    voice_gender: str = "auto",
    language: str = "en",  # "en" | "pt" (pt-BR)
):
    try:
        # ── 1. Transcrição ────────────────────────────────────────────────
        jobs[job_id] = {"status": "transcribing", "progress": 10}
        logger.info(f"[{job_id}] Transcrevendo (language={language})...")
        params = {**TRANSCRIBE_PARAMS_BASE, "language": language}
        segments, info = model.transcribe(tmp_path, **params)
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
                    voice_range = detect_range(words)
                com_nota = sum(1 for w in words if w.get("note"))
                logger.info(f"[{job_id}] {com_nota}/{len(words)} palavras com nota")
            else:
                logger.warning(f"[{job_id}] Pitch: nenhum frame — notas ficarão vazias")
        except Exception as pe:
            import traceback
            logger.error(f"[{job_id}] Pitch erro: {pe}\n{traceback.format_exc()}")

        # ── 3. Resultado e persistência ───────────────────────────────────
        result_data = {
            "words": words,
            "range": detect_range(words),
            "language": info.language,
            "duration": round(info.duration, 2)
        }
        jobs[job_id] = {"status": "done", "progress": 100, "result": result_data}
        logger.info(f"[{job_id}] Job concluído.")

        # Salva no banco (histórico de scores)
        db = None
        try:
            db = SessionLocal()
            score = Score(
                title=f"Song {job_id}",
                language=info.language,
                duration=round(info.duration, 2),
                words=words,
            )
            db.add(score)
            db.commit()
            db.refresh(score)
            if score.id is not None:
                jobs[job_id]["result"]["score_id"] = score.id
        except Exception as db_err:
            logger.warning(f"[{job_id}] Falha ao salvar score no banco: {db_err}")
        finally:
            if db is not None:
                db.close()
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
    language:     str = "en"     # "en" (inglês) | "pt" (português BR)

# Diretório do main.py (para servir o HTML)
_HTML_DIR = Path(__file__).resolve().parent


@app.get("/", response_class=HTMLResponse)
def index():
    """Serve a interface web PitchMVP (upload, URL, microfone, cifra)."""
    html_path = _HTML_DIR / "pitchmvp_web.html"
    if not html_path.exists():
        raise HTTPException(status_code=404, detail="pitchmvp_web.html não encontrado")
    return HTMLResponse(content=html_path.read_text(encoding="utf-8"))

@app.get("/scores")
def list_scores():
    db = SessionLocal()
    try:
        scores = db.query(Score).order_by(Score.id.desc()).all()
        return [
            {"id": s.id, "title": s.title, "duration": s.duration, "language": s.language}
            for s in scores
        ]
    finally:
        db.close()

@app.get("/scores/{score_id}")
def get_score(score_id: int):
    db = SessionLocal()
    try:
        score = db.query(Score).filter(Score.id == score_id).first()
        if not score:
            raise HTTPException(status_code=404, detail="Score não encontrado")
        return {
            "id": score.id,
            "title": score.title,
            "duration": score.duration,
            "language": score.language,
            "words": score.words,
        }
    finally:
        db.close()


@app.delete("/scores/{score_id}")
def delete_score(score_id: int):
    db = SessionLocal()
    try:
        score = db.query(Score).filter(Score.id == score_id).first()
        if not score:
            raise HTTPException(status_code=404, detail="Score não encontrado")
        db.delete(score)
        db.commit()
        return {"ok": True}
    finally:
        db.close()


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
    bg.add_task(run_job, job_id, tmp_path, req.voice_gender, req.language)
    return {"job_id": job_id}

@app.post("/transcribe-file")
async def transcribe_file(
    file: UploadFile = File(...),
    voice_gender: str = Form("auto"),
    language: str = Form("en"),  # "en" | "pt"
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
    bg.add_task(run_job, job_id, tmp_path, voice_gender, language)
    return {"job_id": job_id}