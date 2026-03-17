# app/routes_pitch_realtime.py
from fastapi import APIRouter, BackgroundTasks, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from pathlib import Path
import tempfile, os, uuid, logging, asyncio
import torch
import torchcrepe
import numpy as np
from app.database import SessionLocal
from app.models import Score
from app.music_utils import detect_range
from app.pitch_engine import safe_realtime_pitch
from app.memory_manager import jobs  # Importar jobs do memory_manager para consistência

router = APIRouter()
logger = logging.getLogger(__name__)

# Semáforo para limitar concorrência no processamento realtime
REALTIME_SEMAPHORE = asyncio.Semaphore(4)  # Máximo 4 processamentos simultâneos

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
@router.options("/transcribe-frame-json")
async def realtime_frame(data: FrameData = None):
    async with REALTIME_SEMAPHORE:
        logger.info(f"� Iniciando realtime frame - Slots disponíveis: {REALTIME_SEMAPHORE._value}")
        
        if data is None:
            # Para requisições OPTIONS
            logger.info("📡 OPTIONS request recebido")
            return {"status": "ok"}
        
        if not data.samples:
            logger.error("❌ Nenhum sample enviado")
            raise HTTPException(status_code=400, detail="Nenhum sample enviado")
        
        # Processamento com timeout rigoroso (5 segundos)
        result = await safe_realtime_pitch(data.samples, data.sample_rate)
        
        logger.info(f"✅ Realtime frame processado com sucesso")
        return result

def analyze_voice_characteristics(freq: float, confidence: float) -> dict:
    """Análise completa das características vocais"""
    
    # Classificação de range vocal
    if freq <= 0:
        range_type = "silence"
    elif freq < 130:
        range_type = "bass"
    elif freq < 260:
        range_type = "tenor"
    elif freq < 350:
        range_type = "alto"
    elif freq < 525:
        range_type = "soprano"
    else:
        range_type = "high"
    
    # Qualidade da detecção
    if confidence > 0.9:
        quality = "excellent"
    elif confidence > 0.8:
        quality = "good"
    elif confidence > 0.6:
        quality = "fair"
    else:
        quality = "poor"
    
    # Análise de estabilidade
    stability = "stable" if confidence > 0.7 else "unstable"
    
    # Informação de oitava
    if freq > 0:
        midi = 69 + 12 * np.log2(freq / 440)
        octave = int(midi // 12) - 1
        midi_note = int(round(midi))
    else:
        octave = 0
        midi_note = 0
    
    return {
        "range": range_type,
        "quality": quality,
        "stability": stability,
        "octave": octave,
        "midi_note": midi_note,
        "optimal_range": "auto",  # Pode ser configurado
        "is_in_range": 50 <= freq <= 900,  # Range típico
        "voice_type": detect_voice_type(freq, confidence),
        "harmonics": analyze_harmonics(freq),
        "formants": estimate_formants(freq)
    }

def detect_voice_type(freq: float, confidence: float) -> str:
    """Detecção básica de tipo de voz"""
    if confidence < 0.5:
        return "unvoiced"
    
    if freq < 150:
        return "male_bass"
    elif freq < 300:
        return "male_tenor"
    elif freq < 400:
        return "female_alto"
    elif freq < 600:
        return "female_soprano"
    else:
        return "high_pitch"

def analyze_harmonics(freq: float) -> dict:
    """Análise básica de harmônicos"""
    if freq <= 0:
        return {"fundamental": 0, "harmonics": []}
    
    harmonics = []
    for i in range(1, 5):  # Primeiros 4 harmônicos
        harmonic_freq = freq * i
        if harmonic_freq <= 2000:  # Limite audível
            harmonics.append({
                "order": i,
                "frequency": harmonic_freq,
                "amplitude": 1.0 / i  # Simplificado
            })
    
    return {
        "fundamental": freq,
        "harmonics": harmonics,
        "harmonic_count": len(harmonics)
    }

def estimate_formants(freq: float) -> dict:
    """Estimativa básica de formantes"""
    if freq <= 0:
        return {"f1": 0, "f2": 0, "f3": 0}
    
    # Estimativa simplificada baseada na frequência fundamental
    f1 = min(freq * 1.2, 800)   # Primeiro formante
    f2 = min(freq * 2.5, 2500)  # Segundo formante  
    f3 = min(freq * 3.5, 3500)  # Terceiro formante
    
    return {
        "f1": f1,
        "f2": f2,
        "f3": f3,
        "vowel_estimate": estimate_vowel(f1, f2)
    }

def estimate_vowel(f1: float, f2: float) -> str:
    """Estimativa básica de vogal baseada em formantes"""
    # Simplificado - baseado em padrões típicos
    if f1 < 300 and f2 < 1000:
        return "i"  # /i/
    elif f1 < 400 and f2 < 1500:
        return "e"  # /e/
    elif f1 < 600 and f2 < 2000:
        return "a"  # /a/
    elif f1 < 400 and f2 > 2000:
        return "u"  # /u/
    else:
        return "o"  # /o/

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


def process_realtime_frame(samples, sample_rate):
    """
    Processa frame realtime sem timeout (função pura para ser usada com safe_realtime_pitch)
    """
    logger.info(f"📊 Processando {len(samples)} samples")
    
    # Torch precisa de batch dimension
    samples_tensor = torch.tensor(samples, dtype=torch.float32).unsqueeze(0)

    with torch.no_grad():
        # torchcrepe.predict com periodicity para dados completos
        pitch, periodicity = torchcrepe.predict(
            audio=samples_tensor,
            sample_rate=sample_rate,
            fmin=50.0,
            fmax=2000.0,
            model="full",
            hop_length=int(0.01 * sample_rate),  # 10ms por frame
            device="cpu",
            return_periodicity=True  # ✅ Obter confidence/periodicity
        )

    # Pega o primeiro frame do batch
    freq = float(pitch[0, 0].item())
    confidence = float(periodicity[0, 0].item())
    
    # Análise musical completa
    note_result = freq_to_note(freq)
    
    # Análise de voz e range
    voice_analysis = analyze_voice_characteristics(freq, confidence)
    
    # Dados completos do pitch core
    result = {
        # Dados básicos
        "frequency": freq,
        "note": note_result["note"] if note_result else "-",
        "cents": note_result.get("cents", 0),
        
        # Dados de confiança e qualidade
        "confidence": confidence,
        "periodicity": confidence,
        "voiced": confidence > 0.3,  # Threshold melhorado
        
        # Análise de voz
        "voice_analysis": voice_analysis,
        
        # Metadados do processamento
        "sample_rate": sample_rate,
        "hop_length": int(0.01 * sample_rate),
        "frame_time": 0.01,
        "processing_mode": "realtime",
        "range_info": {
            "fmin": 50.0,
            "fmax": 2000.0,
            "model": "full"
        }
    }
    
    logger.info(f"✅ Frame processado: {result['note']} ({result['frequency']:.2f}Hz)")
    return result

@router.get("/health")
def health():
    return {"status": "ok", "mode": "realtime"}