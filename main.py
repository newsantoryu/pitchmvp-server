# main.py — PitchMVP Transcription Server
# Processamento assíncrono com polling — resolve timeout do ngrok free (30s)

from fastapi import FastAPI, File, HTTPException, UploadFile, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel
from pydantic import BaseModel
import tempfile, os, requests, logging, uuid, time
import numpy as np

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

# Job store em memória — guarda resultado até ser buscado
jobs: dict = {}

# Prompt inicial instrui o Whisper a transcrever seções repetidas
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

NOTE_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]

def freq_to_note(freq):
    if freq <= 0: return None
    midi = int(round(69 + 12 * np.log2(freq / 440)))
    return f"{NOTE_NAMES[midi % 12]}{midi // 12 - 1}"

def extract_pitch(path):
    """Detecta pitch frame-a-frame usando torchcrepe (primário) ou pYIN via librosa (fallback).
    
    torchcrepe: mais preciso para voz, usa deep learning
    librosa pYIN: fallback robusto, sem dependência de torch
    """
    # Tenta torchcrepe primeiro
    try:
        import torch, torchcrepe, librosa
        audio, sr = librosa.load(path, sr=16000, mono=True)
        audio_t = torch.tensor(audio).unsqueeze(0)
        pitch, periodicity = torchcrepe.predict(
            audio_t, sr, hop_length=160, fmin=50, fmax=1000,
            model="full", batch_size=1024, device="cpu", return_periodicity=True
        )
        pitch = pitch[0].cpu().numpy()
        periodicity = periodicity[0].cpu().numpy()
        times = np.arange(len(pitch)) * 0.01
        frames = [{"time": float(t), "freq": float(p)}
                  for t, p, c in zip(times, pitch, periodicity) if c >= 0.8 and p > 0]
        logger.info(f"torchcrepe: {len(frames)} frames de pitch")
        return frames
    except Exception as e:
        logger.warning(f"torchcrepe indisponível ({e}), usando pYIN...")

    # Fallback: pYIN via librosa (instalado junto com faster-whisper)
    try:
        import librosa
        audio, sr = librosa.load(path, sr=22050, mono=True)
        # pYIN: algoritmo probabilístico para detecção de pitch vocal
        f0, voiced_flag, voiced_prob = librosa.pyin(
            audio,
            fmin=librosa.note_to_hz("C2"),   # ~65Hz — nota mais grave
            fmax=librosa.note_to_hz("C6"),   # ~1047Hz — nota mais aguda
            sr=sr,
            hop_length=512,                  # ~23ms por frame a 22050Hz
            fill_na=None,
        )
        hop_duration = 512 / sr
        frames = []
        for i, (freq, voiced) in enumerate(zip(f0, voiced_flag)):
            if voiced and freq and freq > 0:
                frames.append({"time": float(i * hop_duration), "freq": float(freq)})
        logger.info(f"pYIN: {len(frames)} frames de pitch")
        return frames
    except Exception as e:
        logger.error(f"pYIN também falhou: {e}")
        return []


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
def match_notes(words, pitch_frames):
    last_note = None
    for w in words:
        freqs = [f["freq"] for f in pitch_frames if w["start"] <= f["time"] <= w["end"]]
        if freqs:
            note = freq_to_note(float(np.median(freqs)))
        else:
            note = last_note  # mantém nota anterior se sem detecção
        w["note"] = note
        if note:
            last_note = note
    return words

def run_job(job_id: str, tmp_path: str):
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
            pitch_frames = extract_pitch(tmp_path)
            logger.info(f"[{job_id}] {len(pitch_frames)} frames de pitch")
            if pitch_frames:
                words = match_notes(words, pitch_frames)
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
        try: os.unlink(tmp_path)
        except: pass

class TranscribeRequest(BaseModel):
    audio_url: str
    anon_key:  str

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
    bg.add_task(run_job, job_id, tmp_path)
    return {"job_id": job_id}

@app.post("/transcribe-file")
async def transcribe_file(file: UploadFile = File(...), bg: BackgroundTasks = None):
    ext = os.path.splitext(file.filename or "")[1].lower() or ".wav"
    content = await file.read()
    logger.info(f"Upload: {file.filename} ({len(content)/1024:.1f} KB)")
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name
    job_id = str(uuid.uuid4())[:8]
    jobs[job_id] = {"status": "queued", "progress": 5}
    bg.add_task(run_job, job_id, tmp_path)
    return {"job_id": job_id}