from fastapi import APIRouter, BackgroundTasks, HTTPException, UploadFile, File, Form
from fastapi.responses import HTMLResponse
from pathlib import Path
import tempfile, os, uuid, logging, requests, asyncio
from datetime import datetime

# Limite de upload de arquivo
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB

# Semáforo para limitar concorrência no processamento batch
TRANSCRIBE_SEMAPHORE = asyncio.Semaphore(2)  # Máximo 2 processamentos simultâneos

from pydantic import BaseModel
from app.pitch_engine import extract_pitch, safe_extract_pitch, safe_whisper_transcribe
from app.music_utils import match_notes, detect_range
from app.memory_manager import whisper_model_context, get_db_session, jobs, log_memory_usage
from app.models import Score

logger = logging.getLogger(__name__)
router = APIRouter()

_HTML_DIR = Path(__file__).resolve().parent

class TranscribeRequest(BaseModel):
    audio_url: str
    anon_key: str
    voice_gender: str = "auto"
    language: str = "en"

# Função de processamento - CORRIGIDA com timeouts
async def run_job(job_id: str, tmp_path: str, voice_gender: str = "auto", language: str = "en"):
    try:
        # Log memory usage no início
        log_memory_usage()
        
        jobs[job_id] = {"status": "queued", "progress": 5}
        
        # Inicia transcrição
        jobs[job_id] = {"status": "transcribing", "progress": 10}
        logger.info(f"🎵 Iniciando transcrição do job {job_id}")
        
        # ✅ USAR MODELO EM CACHE com timeout generoso
        with whisper_model_context() as model:
            # Atualiza progresso antes do processamento pesado
            jobs[job_id] = {"status": "transcribing", "progress": 20}
            logger.info(f"📝 Usando modelo Whisper em cache...")
            
            # Transcrição com timeout generoso (5 minutos)
            segments, info = await safe_whisper_transcribe(model, tmp_path, language)
            
            # Atualiza progresso após transcrição
            jobs[job_id] = {"status": "transcribing", "progress": 60}
            logger.info(f"📝 Transcrição Whisper concluída, iniciando processamento de palavras")
            
            # Extrai palavras
            words = []
            word_count = 0
            for seg in segments:
                if hasattr(seg, "words") and seg.words:
                    for w in seg.words:
                        words.append({
                            "text": w.word.strip(),
                            "start": round(w.start, 3),
                            "end": round(w.end, 3),
                            "note": None
                        })
                        word_count += 1
                        
                        # Atualiza progresso a cada 50 palavras processadas
                        if word_count % 50 == 0:
                            progress = 60 + min(10, (word_count / 500) * 10)
                            jobs[job_id] = {"status": "transcribing", "progress": int(progress)}
            
            # Atualiza progresso antes do pitch detection
            jobs[job_id] = {"status": "pitch", "progress": 70}
            logger.info(f"🎯 Iniciando detecção de pitch para {len(words)} palavras")
            
            # Detecta pitch com timeout de segurança (180 segundos)
            pitch_frames = await safe_extract_pitch(tmp_path, voice_gender=voice_gender)
            if pitch_frames:
                matched = match_notes(words, pitch_frames)
                for i, w in enumerate(words):
                    w["note"] = matched[i]["note"] if i < len(matched) else None
                    
                    # Atualiza progresso durante o matching
                    if i % 100 == 0:
                        progress = 70 + min(20, (i / len(words)) * 20)
                        jobs[job_id] = {"status": "pitch", "progress": int(progress)}
            
            # Prepara resultado final
            result_data = {
                "words": words,
                "range": detect_range(words),
                "language": info.language,
                "duration": round(info.duration, 2)
            }
            
            jobs[job_id] = {"status": "done", "progress": 100, "result": result_data}
            logger.info(f"✅ Job {job_id} concluído com sucesso - {len(words)} palavras processadas")

            # ✅ USAR DATABASE CONTEXT MANAGER
            with get_db_session() as db:
                score = Score(
                    title=f"Song {job_id}",  # Padrão sem título
                    artist="",  # Padrão sem artista
                    language=info.language,
                    duration=round(info.duration, 2),
                    words=words,
                )
                db.add(score)
                db.commit()
                db.refresh(score)
                jobs[job_id]["result"]["score_id"] = score.id
                logger.info(f"💾 Score salvo no banco com ID: {score.id}")
                
        # Log memory usage no final
        log_memory_usage()
        
    except Exception as e:
        logger.error(f"❌ Erro no job {job_id}: {e}")
        jobs[job_id] = {"status": "error", "progress": 0, "error": str(e), "error_at": datetime.now()}
        log_memory_usage()
    finally:
        # Cleanup do arquivo temporário
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

# Rotas
async def validate_file(file: UploadFile):
    """Valida o tamanho do arquivo antes do processamento"""
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Arquivo muito grande (máximo 100MB)")
    return contents

@router.post("/transcribe")
async def transcribe(req: TranscribeRequest, bg: BackgroundTasks):
    async with TRANSCRIBE_SEMAPHORE:
        logger.info(f"🔄 Iniciando transcribe URL - Slots disponíveis: {TRANSCRIBE_SEMAPHORE._value}")
        
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
        
        logger.info(f" Transcribe URL iniciado - Job ID: {job_id}")
        return {"job_id": job_id}

@router.post("/transcribe-file")
async def transcribe_file(
    file: UploadFile = File(...),
    voice_gender: str = Form("auto"),
    language: str = Form("en"),
    bg: BackgroundTasks = None
):
    async with TRANSCRIBE_SEMAPHORE:
        logger.info(f"🔄 Iniciando transcribe file - Slots disponíveis: {TRANSCRIBE_SEMAPHORE._value}")
        
        # Timeout de 50 minutos apenas para esta rota
        try:
            result = await asyncio.wait_for(
                _process_transcribe_file(file, voice_gender, language, bg),
                timeout=3000  # 50 minutos (apenas esta rota)
            )
            return result
        except asyncio.TimeoutError:
            logger.error(f"⏰ Timeout de 50 minutos na rota transcribe-file")
            raise HTTPException(
                status_code=408, 
                detail="Timeout no processamento (50 minutos máximo para transcribe-file)"
            )


async def _process_transcribe_file(file, voice_gender, language, bg):
    """Função helper com lógica atual da transcribe-file"""
    # Validar tamanho do arquivo
    content = await validate_file(file)
    
    ext = os.path.splitext(file.filename or "")[1].lower() or ".wav"
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name
    job_id = str(uuid.uuid4())[:8]
    jobs[job_id] = {"status": "queued", "progress": 5}
    bg.add_task(run_job, job_id, tmp_path, voice_gender, language)
    
    logger.info(f"✅ Transcribe file iniciado - Job ID: {job_id}")
    return {"job_id": job_id}

@router.get("/job/{job_id}")
def get_job(job_id: str):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado")
    if job["status"] == "done":
        job["completed_at"] = datetime.now()
        return jobs.pop(job_id)
    return job

@router.get("/scores")
def list_scores():
    with get_db_session() as db:
        scores = db.query(Score).order_by(Score.id.desc()).all()
        return [{"id": s.id, "title": s.title, "duration": s.duration, "language": s.language, "words": s.words} for s in scores]

@router.get("/scores/{score_id}")
def get_score(score_id: int):
    with get_db_session() as db:
        score = db.query(Score).filter(Score.id == score_id).first()
        if not score:
            raise HTTPException(status_code=404, detail="Score não encontrado")
        return {"id": score.id, "title": score.title, "duration": score.duration, "language": score.language, "words": score.words}

@router.put("/scores/{score_id}")
def update_score(score_id: int, title: str = Form(...)):
    with get_db_session() as db:
        score = db.query(Score).filter(Score.id == score_id).first()
        if not score:
            raise HTTPException(status_code=404, detail="Score não encontrado")
        
        score.title = title
        db.commit()
        db.refresh(score)
        
        return {
            "id": score.id,
            "title": score.title,
            "duration": score.duration,
            "language": score.language
        }

@router.delete("/scores/{score_id}")
def delete_score(score_id: int):
    with get_db_session() as db:
        score = db.query(Score).filter(Score.id == score_id).first()
        if not score:
            raise HTTPException(status_code=404, detail="Score não encontrado")
        db.delete(score)
        return {"ok": True}

@router.get("/health")
def health():
    try:
        memory_mb = log_memory_usage()
        
        # Verificar status do cache do modelo
        from app.memory_manager import _model_cache
        model_cached = "whisper_model" in _model_cache
        
        # Contar jobs ativos
        active_jobs = len(jobs)
        
        return {
            "status": "ok",
            "model": "large-v3",
            "memory_mb": round(memory_mb, 1),
            "active_jobs": active_jobs,
            "whisper_model_cached": model_cached,
            "cleanup_thread_active": True  # Thread iniciado no memory_manager
        }
    except Exception as e:
        logger.error(f"Erro no health check: {e}")
        return {
            "status": "error",
            "error": str(e),
            "model": "large-v3"
        }