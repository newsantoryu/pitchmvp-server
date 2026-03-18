# pitch_engine.py — detecção de pitch (torchcrepe + fallback pYIN)
# Suporta voice_gender e suavização para melhor cifra

import logging
import numpy as np
import asyncio
import torch
import torchcrepe
from fastapi import HTTPException

logger = logging.getLogger(__name__)

# Importar função do módulo realtime
# Removido import circular - função agora está definida neste arquivo

# Mover process_realtime_frame para cá para resolver import circular
def process_realtime_frame_moved(samples, sample_rate):
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
    from app.music_utils import freq_to_note
    # Função local para evitar import circular
    def analyze_voice_characteristics(freq: float, confidence: float) -> dict:
        """Análise completa das características vocais"""
        
        # Classificação de range vocal
        if freq < 100:
            voice_type = "Bass"
            range_desc = "Grave"
        elif freq < 200:
            voice_type = "Tenor"
            range_desc = "Médio-grave"
        elif freq < 400:
            voice_type = "Alto"
            range_desc = "Médio-agudo"
        else:
            voice_type = "Soprano"
            range_desc = "Agudo"
        
        return {
            "voice_type": voice_type,
            "range_description": range_desc,
            "frequency_range": f"{freq:.1f}Hz",
            "confidence_level": "Alta" if confidence > 0.7 else "Média" if confidence > 0.4 else "Baixa"
        }
    
    note_result = freq_to_note(freq)
    
    # Análise de voz e range
    voice_analysis = analyze_voice_characteristics(freq, confidence)
    
    # Dados completos do pitch core
    result = {
        # Dados básicos
        "frequency": freq,
        "note": note_result if isinstance(note_result, str) else (note_result["note"] if note_result else "-"),
        "cents": note_result.get("cents", 0) if isinstance(note_result, dict) else 0,
        
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
    
    logger.info(f"✅ Realtime frame processado: {result['note']} ({result['frequency']:.1f}Hz)")
    return result

# Configurações de timeout diferenciadas
TIMEOUT_CONFIG = {
    "pitch_extraction": 0,       # 0 = sem timeout - processamento pode demorar quanto precisar
    "realtime_frame": 5,         # 5 segundos - deve ser instantâneo
    "whisper_transcribe": 300,   # 5 minutos - arquivos longos são esperados
}

# Ranges por gênero vocal (Hz)
# Masculino: até 900 Hz para incluir tenor agudo e falsete (C5 ≈ 523, G5 ≈ 784)
# Feminino: C3–G5; Auto: largo para qualquer voz
VOICE_RANGES = {
    "male":   {"fmin": 75,  "fmax": 900,  "pyin_lo": "C2", "pyin_hi": "G5"},
    "female": {"fmin": 120, "fmax": 900,  "pyin_lo": "C3", "pyin_hi": "G5"},
    "auto":   {"fmin": 60,  "fmax": 900,  "pyin_lo": "C2", "pyin_hi": "C6"},
}


def extract_pitch(path: str, voice_gender: str = "auto"):
    """
    Detecta pitch: torchcrepe (primário, com suavização) ou pYIN (fallback).
    voice_gender: "male" | "female" | "auto"
    """
    vr = VOICE_RANGES.get(voice_gender, VOICE_RANGES["auto"])
    logger.info(f"Pitch range: {voice_gender} → fmin={vr['fmin']}Hz fmax={vr['fmax']}Hz")

    # Primário: torchcrepe
    try:
        import torch
        import torchcrepe
        import librosa

        audio, sr = librosa.load(path, sr=16000, mono=True)
        audio_t = torch.tensor(audio).unsqueeze(0)
        pitch, periodicity = torchcrepe.predict(
            audio_t, sr, hop_length=160,
            fmin=vr["fmin"], fmax=vr["fmax"],
            model="full", batch_size=1024, device="cpu", return_periodicity=True
        )
        
        # ✅ Liberar tensors imediatamente
        pitch_np = pitch[0].cpu().numpy()
        periodicity_np = periodicity[0].cpu().numpy()
        
        # ✅ Limpar tensors do torch
        del pitch, periodicity, audio_t
        if 'torch' in locals():
            import torch
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        
        times = np.arange(len(pitch_np)) * 0.01
        conf_min = 0.78 if voice_gender == "male" else 0.85
        frames = [
            {"time": float(t), "freq": float(p)}
            for t, p, c in zip(times, pitch_np, periodicity_np)
            if c >= conf_min and p > 0 and vr["fmin"] <= p <= vr["fmax"]
        ]
        logger.info(f"torchcrepe: {len(frames)} frames ({voice_gender}, conf>={conf_min})")

        # Suavização (remove jitter)
        if len(frames) > 3:
            freqs = np.array([f["freq"] for f in frames])
            smooth = librosa.decompose.nn_filter(
                freqs.reshape(1, -1), aggregate=np.median
            ).flatten()
            for i in range(len(frames)):
                frames[i]["freq"] = float(smooth[i])
        
        # ✅ Forçar garbage collection
        import gc
        gc.collect()
        
        return frames
        
    except Exception as e:
        logger.warning(f"torchcrepe indisponível ({e}), usando pYIN...")
        
        # ✅ Cleanup em caso de erro
        if 'audio_t' in locals():
            del audio_t
        if 'pitch' in locals():
            del pitch
        if 'periodicity' in locals():
            del periodicity
        if 'torch' in locals():
            import torch
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        import gc
        gc.collect()

    # Fallback: pYIN
    try:
        import librosa
        audio, sr = librosa.load(path, sr=22050, mono=True)
        f0, voiced_flag, _ = librosa.pyin(
            audio,
            fmin=librosa.note_to_hz(vr["pyin_lo"]),
            fmax=librosa.note_to_hz(vr["pyin_hi"]),
            sr=sr, hop_length=512, fill_na=None,
        )
        hop_duration = 512 / sr
        frames = [
            {"time": float(i * hop_duration), "freq": float(f)}
            for i, (f, v) in enumerate(zip(f0, voiced_flag))
            if v and f and f > 0
        ]
        logger.info(f"pYIN: {len(frames)} frames ({voice_gender})")
        return frames
    except Exception as e:
        logger.error(f"pYIN fallback falhou: {e}")
        return []


# Funções seguras com timeout
async def safe_extract_pitch(file_path: str, voice_gender: str = "auto"):
    """
    Executa extract_pitch sem timeout - processamento pode demorar quanto precisar
    """
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, extract_pitch, file_path, voice_gender)
        return result
    except Exception as e:
        logger.error(f"❌ Erro no processamento de pitch: {file_path} - {e}")
        # Propaga erro real, não timeout
        raise e


async def safe_whisper_transcribe(model, tmp_path, language):
    """
    Executa transcrição Whisper com timeout generoso (5 minutos)
    """
    try:
        loop = asyncio.get_event_loop()
        
        # Função wrapper para passar argumentos corretamente
        def transcribe_with_args():
            return model.transcribe(tmp_path, word_timestamps=True, language=language)
        
        segments, info = await asyncio.wait_for(
            loop.run_in_executor(None, transcribe_with_args),
            timeout=TIMEOUT_CONFIG["whisper_transcribe"]  # 5 minutos
        )
        return segments, info
    except asyncio.TimeoutError:
        logger.error(f"⏰ Timeout na transcrição Whisper: {tmp_path}")
        raise HTTPException(status_code=408, detail="Arquivo muito longo para processamento. Tente um arquivo menor.")


async def safe_realtime_pitch(samples, sample_rate):
    """
    Executa processamento realtime com timeout rigoroso (5 segundos)
    """
    try:
        loop = asyncio.get_event_loop()
        
        # Usar função local para evitar import circular
        def process_frame_with_args():
            return process_realtime_frame_moved(samples, sample_rate)
        
        result = await asyncio.wait_for(
            loop.run_in_executor(None, process_frame_with_args),
            timeout=TIMEOUT_CONFIG["realtime_frame"]  # 5 segundos
        )
        return result
    except asyncio.TimeoutError:
        logger.error(f"⏰ Timeout no processamento realtime")
        raise HTTPException(status_code=408, detail="Timeout no processamento em tempo real")
    except Exception as e:
        logger.error(f"❌ Erro no processamento realtime: {e}")
        raise HTTPException(status_code=500, detail="Erro no processamento de áudio")
