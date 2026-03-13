# main.py — PitchMVP Transcription Server (desktop)
# Roda localmente com large-v3 — sem limite de RAM

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel
from pydantic import BaseModel
import tempfile, os, requests, logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="PitchMVP Transcription API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["POST","GET"], allow_headers=["*"])

# large-v3: melhor modelo disponível, sem limite de RAM no desktop
# Na primeira execução baixa ~3GB — depois fica em cache
logger.info("Carregando modelo large-v3...")
model = WhisperModel(
    "large-v3",
    device="cpu",
    compute_type="int8",
    cpu_threads=8,                  # usa todos os cores disponíveis
    download_root=os.path.expanduser("~/.cache/whisper-models")
)
logger.info("Modelo pronto.")


class TranscribeRequest(BaseModel):
    audio_url: str
    anon_key:  str


@app.get("/health")
def health():
    return {"status": "ok", "model": "large-v3"}


@app.post("/transcribe")
async def transcribe(req: TranscribeRequest):
    audio_url = req.audio_url.strip()
    if not audio_url.startswith("https://"):
        raise HTTPException(status_code=400, detail="audio_url deve ser HTTPS.")

    logger.info(f"Baixando: {audio_url}")
    ext = os.path.splitext(audio_url.split("?")[0])[1].lower() or ".wav"

    headers = {
        "Authorization": f"Bearer {req.anon_key}",
        "apikey": req.anon_key,
    }

    try:
        response = requests.get(audio_url, headers=headers, timeout=60)
        response.raise_for_status()
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Falha ao baixar áudio: {e}")

    logger.info(f"Baixado: {len(response.content)/1024:.1f} KB")

    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(response.content)
        tmp_path = tmp.name

    try:
        segments, info = model.transcribe(
            tmp_path,
            language="en",
            word_timestamps=True,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500),
            beam_size=5,
            best_of=5,
            temperature=0.0,
            condition_on_previous_text=False,   # evita repetição de refrão
            compression_ratio_threshold=1.8,
            no_speech_threshold=0.6,
            log_prob_threshold=-0.5,
            repetition_penalty=1.3,
        )

        words = []
        for segment in segments:
            if segment.words:
                for word in segment.words:
                    text = word.word.strip().strip(".,!?;:\"'()[]")
                    if text:
                        words.append({
                            "text":  text,
                            "start": round(word.start, 3),
                            "end":   round(word.end,   3),
                        })

        logger.info(f"Concluído: {len(words)} palavras, {info.duration:.1f}s")
        return {"words": words, "language": info.language, "duration": round(info.duration, 2)}

    except Exception as e:
        logger.error(f"Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        os.unlink(tmp_path)


@app.post("/transcribe-file")
async def transcribe_file(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename or "")[1].lower() or ".wav"
    content = await file.read()
    logger.info(f"Upload recebido: {file.filename} ({len(content)/1024:.1f} KB)")
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name
    try:
        segments, info = model.transcribe(
            tmp_path, language="en", word_timestamps=True,
            vad_filter=True, vad_parameters=dict(min_silence_duration_ms=500),
            beam_size=5, best_of=5, temperature=0.0,
            condition_on_previous_text=False, compression_ratio_threshold=1.8,
            no_speech_threshold=0.6, log_prob_threshold=-0.5, repetition_penalty=1.3,
        )
        words = []
        for segment in segments:
            if segment.words:
                for word in segment.words:
                    text = word.word.strip().strip(".,!?;:\"'()[]")
                    if text:
                        words.append({"text": text, "start": round(word.start, 3), "end": round(word.end, 3)})
        logger.info(f"Concluído: {len(words)} palavras")
        return {"words": words, "language": info.language, "duration": round(info.duration, 2)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        os.unlink(tmp_path)
