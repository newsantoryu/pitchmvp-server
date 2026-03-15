from fastapi import APIRouter, BackgroundTasks, HTTPException, UploadFile, File, Form
from fastapi.responses import HTMLResponse
from pathlib import Path
import tempfile, os, uuid, logging, requests

from pydantic import BaseModel
from app.pitch_engine import extract_pitch
from app.music_utils import match_notes, detect_range
from app.database import SessionLocal
from app.models import Score

logger = logging.getLogger(__name__)
router = APIRouter()

# Jobs globais
jobs = {}

_HTML_DIR = Path(__file__).resolve().parent

class TranscribeRequest(BaseModel):
    audio_url: str
    anon_key: str
    voice_gender: str = "auto"
    language: str = "en"

# Função de processamento
def run_job(job_id: str, tmp_path: str, voice_gender: str = "auto", language: str = "en"):
    try:
        jobs[job_id] = {"status": "transcribing", "progress": 10}
        from faster_whisper import WhisperModel
        model = WhisperModel("large-v3", device="cpu", compute_type="int8", cpu_threads=8)
        segments, info = model.transcribe(tmp_path, word_timestamps=True, language=language)
        
        # Extrai palavras
        words = []
        for seg in segments:
            if hasattr(seg, "words") and seg.words:
                for w in seg.words:
                    words.append({
                        "text": w.word.strip(),
                        "start": round(w.start, 3),
                        "end": round(w.end, 3),
                        "note": None
                    })
        
        # Detecta pitch
        jobs[job_id]["status"] = "pitch"
        pitch_frames = extract_pitch(tmp_path, voice_gender=voice_gender)
        if pitch_frames:
            matched = match_notes(words, pitch_frames)
            for i, w in enumerate(words):
                w["note"] = matched[i]["note"] if i < len(matched) else None
        
        result_data = {
            "words": words,
            "range": detect_range(words),
            "language": info.language,
            "duration": round(info.duration, 2)
        }
        jobs[job_id] = {"status": "done", "progress": 100, "result": result_data}

        # Salva no banco
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
        jobs[job_id]["result"]["score_id"] = score.id
        db.close()
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

# Rotas
@router.post("/transcribe")
async def transcribe(req: TranscribeRequest, bg: BackgroundTasks):
    audio_url = req.audio_url.strip()
    if not audio_url.startswith("https://"):
        raise HTTPException(status_code=400, detail="audio_url deve ser HTTPS.")
    ext = os.path.splitext(audio_url.split("?")[0])[1].lower() or ".wav"
    headers = {"Authorization": f"Bearer {req.anon_key}", "apikey": req.anon_key}
    resp = requests.get(audio_url, headers=headers)
    resp.raise_for_status()
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(resp.content)
        tmp_path = tmp.name
    job_id = str(uuid.uuid4())[:8]
    jobs[job_id] = {"status": "queued", "progress": 5}
    bg.add_task(run_job, job_id, tmp_path, req.voice_gender, req.language)
    return {"job_id": job_id}

@router.post("/transcribe-file")
async def transcribe_file(
    file: UploadFile = File(...),
    voice_gender: str = Form("auto"),
    language: str = Form("en"),
    bg: BackgroundTasks = None
):
    ext = os.path.splitext(file.filename or "")[1].lower() or ".wav"
    content = await file.read()
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name
    job_id = str(uuid.uuid4())[:8]
    jobs[job_id] = {"status": "queued", "progress": 5}
    bg.add_task(run_job, job_id, tmp_path, voice_gender, language)
    return {"job_id": job_id}

@router.get("/job/{job_id}")
def get_job(job_id: str):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado")
    if job["status"] == "done":
        return jobs.pop(job_id)
    return job

@router.get("/scores")
def list_scores():
    db = SessionLocal()
    scores = db.query(Score).order_by(Score.id.desc()).all()
    db.close()
    return [{"id": s.id, "title": s.title, "duration": s.duration, "language": s.language} for s in scores]

@router.get("/scores/{score_id}")
def get_score(score_id: int):
    db = SessionLocal()
    score = db.query(Score).filter(Score.id == score_id).first()
    db.close()
    if not score:
        raise HTTPException(status_code=404, detail="Score não encontrado")
    return {"id": score.id, "title": score.title, "duration": score.duration, "language": score.language, "words": score.words}

@router.delete("/scores/{score_id}")
def delete_score(score_id: int):
    db = SessionLocal()
    score = db.query(Score).filter(Score.id == score_id).first()
    if not score:
        db.close()
        raise HTTPException(status_code=404, detail="Score não encontrado")
    db.delete(score)
    db.commit()
    db.close()
    return {"ok": True}

@router.get("/health")
def health():
    return {"status": "ok", "model": "large-v3"}