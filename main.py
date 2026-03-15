from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import logging
from app.database import Base, engine
from app.routes_pitch import router as pitch_router
from app.routes_pitch_realtime import router as realtime_router

# Cria tabelas
Base.metadata.create_all(bind=engine)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="PitchMVP Transcription API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# Routers
app.include_router(pitch_router, prefix="/pitch")
app.include_router(realtime_router, prefix="/pitch-realtime")

# Frontend
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")

logger.info("PitchMVP API inicializada com sucesso!")

# listar todas as rotas ativas
for route in app.routes:
    print(route.path)