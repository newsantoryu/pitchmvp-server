# app/routes_pitch_realtime.py
from fastapi import APIRouter, BackgroundTasks, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from pathlib import Path
import tempfile, os, uuid, logging
import torch
import torchcrepe
from app.database import SessionLocal
from app.models import Score
from app.music_utils import detect_range

router = APIRouter()
logger = logging.getLogger(__name__)

# Jobs globais
jobs = {}

# -------------------------------
# Models
# -------------------------------
# Estrutura de dados enviada pelo frontend
class FrameData(BaseModel):
    samples: list[float]
    sample_rate: int

NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

def freq_to_note(freq: float):
    """Converte frequência em nota musical e cents"""
    import math
    if freq <= 0:
        return {"note": "-", "freq": 0.0, "cents": 0}
    midi = 69 + 12 * math.log2(freq / 440)
    note_index = int(round(midi)) % 12
    cents = int((midi - round(midi)) * 100)
    return {"note": NOTE_NAMES[note_index], "freq": freq, "cents": cents}

@router.post("/transcribe-frame-json")
async def realtime_frame(data: FrameData):
    if not data.samples:
        raise HTTPException(status_code=400, detail="Nenhum sample enviado")
    
    # Torch precisa de batch dimension
    samples = torch.tensor(data.samples, dtype=torch.float32).unsqueeze(0)

    with torch.no_grad():
        # torchcrepe.predict atual retorna apenas pitch
        pitch = torchcrepe.predict(
            audio=samples,
            sample_rate=data.sample_rate,
            fmin=50.0,
            fmax=2000.0,
            model="full",
            hop_length=int(0.01 * data.sample_rate),  # 10ms por frame
            device="cpu"  # ou "cuda" se tiver GPU
        )

    # Pega o primeiro frame do batch
    freq = float(pitch[0, 0].item())
    return freq_to_note(freq)

def run_realtime_job(job_id: str, tmp_path: str, voice_gender: str = "auto"):
    """
    Detecta pitch de um arquivo curto em tempo real.
    """
    try:
        jobs[job_id] = {"status": "pitch", "progress": 10}
        # Aqui você pode usar seu extract_pitch existente
        # pitch_frames = extract_pitch(tmp_path, voice_gender=voice_gender)
        pitch_frames = []  # placeholder se quiser testar sem extract_pitch
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