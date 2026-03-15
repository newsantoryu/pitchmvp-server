from fastapi import APIRouter, BackgroundTasks, UploadFile, File, Form, HTTPException
from pathlib import Path
import tempfile, os, uuid, logging

from app.pitch_engine import extract_pitch
from app.music_utils import detect_range
from app.database import SessionLocal
from app.models import Score

router = APIRouter()
logger = logging.getLogger(__name__)

# Jobs globais (compartilha com routes_pitch se necessário)
jobs = {}

def run_realtime_job(job_id: str, tmp_path: str, voice_gender: str = "auto"):
    """
    Detecta pitch de um arquivo curto em tempo real.
    Não faz transcrição de palavras.
    """
    try:
        jobs[job_id] = {"status": "pitch", "progress": 10}
        pitch_frames = extract_pitch(tmp_path, voice_gender=voice_gender)
        result_data = {
            "frames": pitch_frames,
            "range": detect_range([{"note": f} for f in pitch_frames]) if pitch_frames else [],
        }
        jobs[job_id] = {"status": "done", "progress": 100, "result": result_data}

        # Salva no banco
        db = SessionLocal()
        score = Score(
            title=f"Realtime {job_id}",
            language="realtime",
            duration=len(pitch_frames)/100 if pitch_frames else 0,
            words=[{"note": f} for f in pitch_frames] if pitch_frames else [],
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

@router.post("/transcribe-file")
async def realtime_file(
    file: UploadFile = File(...),
    voice_gender: str = Form("auto"),
    bg: BackgroundTasks = None
):
    ext = os.path.splitext(file.filename or "")[1].lower() or ".wav"
    content = await file.read()
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    job_id = str(uuid.uuid4())[:8]
    jobs[job_id] = {"status": "queued", "progress": 5}
    bg.add_task(run_realtime_job, job_id, tmp_path, voice_gender)
    return {"job_id": job_id}

@router.get("/job/{job_id}")
def get_job(job_id: str):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado")
    if job["status"] == "done":
        return jobs.pop(job_id)
    return job

@router.get("/health")
def health():
    return {"status": "ok", "mode": "realtime"}