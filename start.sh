#!/bin/bash
# start.sh — inicia servidor + ngrok e mostra a URL pública
set -e

echo "=== PitchMVP Transcription Server ==="

# Ativa venv
source "$(dirname "$0")/venv/bin/activate"

# Mata processos anteriores nas portas usadas
pkill -f "uvicorn main:app" 2>/dev/null || true
pkill -f "ngrok http" 2>/dev/null || true
sleep 1

echo "[1/2] Iniciando servidor FastAPI na porta 8000..."
uvicorn main:app --host 0.0.0.0 --port 8000 &
SERVER_PID=$!
sleep 3

echo "[2/2] Iniciando túnel ngrok..."
ngrok http 8000 --log=stdout &
NGROK_PID=$!
sleep 4

# Pega a URL pública do ngrok via API local
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels \
    | python3 -c "import sys,json; t=json.load(sys.stdin)['tunnels']; print([x for x in t if x['proto']=='https'][0]['public_url'])" 2>/dev/null)

echo ""
echo "======================================"
echo "  Servidor rodando!"
echo "  URL pública: $NGROK_URL"
echo "======================================"
echo ""
echo "Cole essa URL no WhisperTranscriber.swift:"
echo "  static let serverURL = \"$NGROK_URL\""
echo ""
echo "Pressione Ctrl+C para parar."

# Aguarda
wait $SERVER_PID
