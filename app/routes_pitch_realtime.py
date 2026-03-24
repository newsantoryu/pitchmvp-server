# app/routes_pitch_realtime.py — rotas para processamento realtime de pitch
#
# Correções aplicadas (vs versão original):
#
#   BUG CRÍTICO 2 — CORRIGIDO
#     estimate_formants() calculava F1/F2/F3 multiplicando o F0 por constantes
#     (f1 = freq * 1.2, f2 = freq * 2.5, f3 = freq * 3.5). Isso é acusticamente
#     inválido: formantes são ressonâncias do trato vocal, completamente
#     independentes do F0. Um tenor em C4 (262 Hz) e um soprano em C5 (523 Hz)
#     têm F1 similar para a mesma vogal (~700–800 Hz para /a/).
#     Cálculo correto exige LPC (Linear Predictive Coding) sobre o sinal bruto —
#     impossível aqui pois só temos o F0. Funções removidas completamente.
#     estimate_vowel() que dependia delas também removida.
#
#   PROBLEMA — CORRIGIDO
#     freq_to_note() estava duplicada aqui (3ª implementação no projeto).
#     Removida. Agora usa a fonte canônica: app.note_utils.freq_to_note().
#
#   PROBLEMA — CORRIGIDO
#     analyze_voice_characteristics() estava duplicada aqui e em pitch_engine.py
#     com classificações diferentes (limites distintos). Removida daqui.
#     pitch_engine._analyze_voice_characteristics() é a versão autorizada.
#
#   NOTA SOBRE voiced E frame aggregation:
#     Essas correções estão em pitch_engine.process_realtime_frame_moved(),
#     que é chamado aqui via safe_realtime_pitch(). Esta rota não precisa
#     se preocupar com esses detalhes — o engine já entrega o resultado correto.

from fastapi import APIRouter, BackgroundTasks, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from pathlib import Path
import tempfile, os, uuid, logging, asyncio
import numpy as np

from app.database import SessionLocal
from app.models import Score
from app.note_utils import freq_to_note, note_to_midi, midi_to_note
from app.music_utils import detect_range
from app.pitch_engine import (
    safe_realtime_pitch,
    process_realtime_frame_moved,
    extract_pitch,
    VOICED_THRESHOLD,
)
from app.memory_manager import jobs

router = APIRouter()
logger = logging.getLogger(__name__)

# Máximo 4 frames simultâneos — o torchcrepe em CPU não escala além disso
REALTIME_SEMAPHORE = asyncio.Semaphore(4)


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class FrameData(BaseModel):
    samples: list[float]
    sample_rate: int


# ---------------------------------------------------------------------------
# Voice type detection — baseado em F0 + confidence (descritivo, não acústico)
# ---------------------------------------------------------------------------

def detect_voice_type(freq: float, confidence: float) -> str:
    """
    Classificação descritiva do tipo de voz baseada no F0.

    IMPORTANTE: isso é uma heurística de range, NÃO análise timbral.
    O tipo real de voz (tenor vs barítono vs soprano) exige análise
    espectral do trato vocal, não apenas o F0.
    """
    if confidence < VOICED_THRESHOLD:
        return "unvoiced"
    if freq <= 0:
        return "silence"
    if freq < 150:
        return "male_bass"
    if freq < 300:
        return "male_tenor"
    if freq < 400:
        return "female_alto"
    if freq < 600:
        return "female_soprano"
    return "high_pitch"


def analyze_harmonics(freq: float) -> dict:
    """
    Lista os primeiros harmônicos teóricos do fundamental.

    Nota: isso são as frequências ESPERADAS dos harmônicos, não
    as amplitudes medidas. Para amplitude real seria necessário FFT do frame.
    A amplitude 1/n é uma aproximação de dente-de-serra — simplificada.
    """
    if freq <= 0:
        return {"fundamental": 0, "harmonics": [], "harmonic_count": 0}

    harmonics = []
    for i in range(1, 6):  # Primeiros 5 harmônicos
        h_freq = freq * i
        if h_freq > 4000:  # Acima do range vocal relevante
            break
        harmonics.append({
            "order":     i,
            "frequency": round(h_freq, 1),
            # amplitude 1/n = simplificação de série de Fourier de onda quadrada
            # NÃO representa a voz real — apenas referência teórica
            "amplitude_theoretical": round(1.0 / i, 3),
        })

    return {
        "fundamental":    round(freq, 1),
        "harmonics":      harmonics,
        "harmonic_count": len(harmonics),
        "note": "(amplitudes teóricas — não medidas do sinal real)",
    }


# ---------------------------------------------------------------------------
# Rota principal: frame realtime JSON
# ---------------------------------------------------------------------------

@router.post("/transcribe-frame-json")
@router.options("/transcribe-frame-json")
async def realtime_frame(data: FrameData = None):
    """
    Recebe um frame de áudio (array de floats + sample_rate) e retorna
    a nota detectada com confiança, cents e análise de voz.

    O processamento pesado (torchcrepe, agregação de frames, voiced filter)
    é feito em pitch_engine.safe_realtime_pitch() / process_realtime_frame_moved().
    """
    async with REALTIME_SEMAPHORE:
        logger.info(
            "Realtime frame — slots disponíveis: %d",
            REALTIME_SEMAPHORE._value,
        )

        if data is None:
            # Requisição OPTIONS (preflight CORS)
            return {"status": "ok"}

        if not data.samples:
            raise HTTPException(status_code=400, detail="Nenhum sample enviado")

        # Validação básica do sample_rate
        if data.sample_rate not in (8000, 16000, 22050, 44100, 48000):
            logger.warning("sample_rate incomum: %d Hz", data.sample_rate)

        # Processamento com timeout (5 s — definido em pitch_engine.py)
        result = await safe_realtime_pitch(data.samples, data.sample_rate)

        # Enriquecer com harmônicos teóricos e tipo de voz descritivo
        # (formantes REMOVIDOS — eram calculados incorretamente do F0)
        freq = result.get("frequency", 0.0)
        conf = result.get("confidence", 0.0)

        result["harmonics"]  = analyze_harmonics(freq)
        result["voice_type"] = detect_voice_type(freq, conf)

        logger.info("Realtime frame OK — %s", result.get("note", "-"))
        return result


# ---------------------------------------------------------------------------
# Rota: arquivo curto realtime (background job)
# ---------------------------------------------------------------------------

def run_realtime_job(job_id: str, tmp_path: str, voice_gender: str = "auto"):
    """
    Detecta pitch de um arquivo curto em background.
    Resultado salvo em jobs[job_id] e persistido no banco.
    """
    try:
        jobs[job_id] = {"status": "pitch", "progress": 10}

        pitch_frames = extract_pitch(tmp_path, voice_gender=voice_gender)

        # Converter frames para notas (com cents)
        note_frames = []
        for f in pitch_frames:
            nr = freq_to_note(f["freq"])
            if nr:
                note_frames.append({
                    "time":  f["time"],
                    "freq":  f["freq"],
                    "note":  nr["note"],
                    "cents": nr["cents"],
                })

        range_input = [{"note": nf["note"]} for nf in note_frames]

        result_data = {
            "frames": note_frames,
            "range":  detect_range(range_input) if note_frames else None,
        }

        jobs[job_id] = {"status": "done", "progress": 100, "result": result_data}

        # Persiste no banco
        db = SessionLocal()
        try:
            duration = pitch_frames[-1]["time"] if pitch_frames else 0.0
            score = Score(
                title=f"Realtime {job_id}",
                language="realtime",
                duration=round(duration, 2),
                words=note_frames,
            )
            db.add(score)
            db.commit()
            db.refresh(score)
            jobs[job_id]["result"]["score_id"] = score.id
        finally:
            db.close()

    except Exception as e:
        logger.error("Erro no realtime job %s: %s", job_id, e)
        jobs[job_id] = {"status": "error", "progress": 0, "error": str(e)}
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


@router.post("/transcribe-file")
async def realtime_file(
    file: UploadFile = File(...),
    voice_gender: str = Form("auto"),
    bg: BackgroundTasks = None,
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
    return {"status": "ok", "mode": "realtime", "voiced_threshold": VOICED_THRESHOLD}