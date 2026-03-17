# API v1 - Versão organizada da API
# Mantém todas as rotas existentes com prefixo /api/v1

from fastapi import APIRouter
from app.routes_pitch import router as pitch_router
from app.routes_pitch_realtime import router as realtime_router

# Router principal da API v1
api_v1_router = APIRouter(prefix="/api/v1")

# Incluir routers existentes com seus prefixos
api_v1_router.include_router(pitch_router, prefix="/pitch")
api_v1_router.include_router(realtime_router, prefix="/pitch-realtime")
