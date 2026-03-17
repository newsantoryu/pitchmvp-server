# memory_manager.py - Gerenciamento de memória e modelos
import threading
import time
import logging
from datetime import datetime, timedelta
from contextlib import contextmanager
import psutil

logger = logging.getLogger(__name__)

# Cache thread-safe do modelo
_model_cache = {}
_model_lock = threading.Lock()

# Jobs globais com cleanup
jobs = {}
_jobs_lock = threading.Lock()

def get_whisper_model():
    """Retorna modelo Whisper em cache (singleton)"""
    with _model_lock:
        if "whisper_model" not in _model_cache:
            logger.info("🧠 Carregando modelo Whisper (cache)...")
            from faster_whisper import WhisperModel
            _model_cache["whisper_model"] = WhisperModel(
                "large-v3", device="cpu", compute_type="int8", cpu_threads=8
            )
            logger.info("✅ Modelo Whisper carregado e em cache")
        return _model_cache["whisper_model"]

@contextmanager
def whisper_model_context():
    """Context manager para garantir cleanup"""
    model = get_whisper_model()
    try:
        yield model
    finally:
        # Força garbage collection se necessário
        import gc
        gc.collect()

@contextmanager
def get_db_session():
    """Context manager para database session"""
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

def cleanup_old_jobs():
    """Remove jobs mais antigos que 1 hora - rodando em thread separada"""
    while True:
        try:
            current_time = datetime.now()
            jobs_to_remove = []
            
            with _jobs_lock:
                for job_id, job in list(jobs.items()):
                    # Remove jobs concluídos há mais de 1 hora
                    if job["status"] == "done":
                        job_time = job.get("completed_at", current_time)
                        if current_time - job_time > timedelta(hours=1):
                            jobs_to_remove.append(job_id)
                    # Remove jobs falhados há mais de 30 minutos
                    elif job["status"] == "error":
                        job_time = job.get("error_at", current_time)
                        if current_time - job_time > timedelta(minutes=30):
                            jobs_to_remove.append(job_id)
            
            for job_id in jobs_to_remove:
                with _jobs_lock:
                    jobs.pop(job_id, None)
                logger.info(f"🧹 Job {job_id} removido do cache")
                
        except Exception as e:
            logger.error(f"Erro no cleanup de jobs: {e}")
        
        time.sleep(300)  # Executa a cada 5 minutos

def log_memory_usage():
    """Log uso de memória do processo"""
    try:
        process = psutil.Process()
        memory_info = process.memory_info()
        memory_mb = memory_info.rss / 1024 / 1024
        
        logger.info(f"📊 Memory usage: {memory_mb:.1f}MB")
        
        # Alerta se uso muito alto
        if memory_mb > 8000:  # 8GB
            logger.warning(f"⚠️ High memory usage: {memory_mb:.1f}MB")
            
        return memory_mb
    except Exception as e:
        logger.error(f"Erro ao monitorar memória: {e}")
        return 0

# Iniciar cleanup thread
cleanup_thread = threading.Thread(target=cleanup_old_jobs, daemon=True)
cleanup_thread.start()
logger.info("🧹 Cleanup thread iniciado")
