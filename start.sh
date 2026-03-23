#!/bin/bash
# start.sh — inicia servidor + ngrok com porta dinâmica

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== PitchMVP Transcription Server ==="
echo ""

# Ativa venv
source "$SCRIPT_DIR/venv/bin/activate"

# Função para encontrar porta disponível
find_free_port() {
    local port=$1
    while true; do
        if ! nc -z localhost $port 2>/dev/null; then
            echo $port
            return 0
        fi
        port=$((port + 1))
        if [ $port -gt 9000 ]; then
            echo "ERROR"
            return 1
        fi
    done
}

# Limpar processos
echo "[1] Limpando processos anteriores..."
pkill -9 -f "uvicorn main:app" 2>/dev/null || true
pkill -9 -f "ngrok http" 2>/dev/null || true
for p in {8000..8010}; do
    lsof -ti:$p 2>/dev/null | xargs kill -9 2>/dev/null || true
done
sleep 2

# Encontrar porta livre
echo "[2] Detectando porta disponível..."
PORT=$(find_free_port 8000)
if [ "$PORT" = "ERROR" ]; then
    echo "❌ Erro: nenhuma porta disponível"
    exit 1
fi
echo "✓ Porta $PORT disponível"
echo ""

# Iniciar uvicorn
echo "[3] Iniciando FastAPI na porta $PORT..."
uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1 2>&1 &
SERVER_PID=$!
sleep 4

# Verificar se servidor iniciou
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "❌ Erro: servidor não iniciou (PID $SERVER_PID não existe)"
    exit 1
fi
echo "✓ Servidor rodando (PID: $SERVER_PID)"
echo ""

# Iniciar ngrok
echo "[4] Iniciando ngrok na porta $PORT..."
ngrok http $PORT --log=stdout 2>&1 &
NGROK_PID=$!
sleep 4

# Pega URL pública
echo "[5] Obtendo URL pública..."
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | \
    python3 -c "import sys,json; tunnels=json.load(sys.stdin)['tunnels']; https=[t['public_url'] for t in tunnels if t['proto']=='https']; print(https[0] if https else '')" 2>/dev/null || echo "")

# Output final
echo ""
echo "======================================"
echo "  ✅ SERVIDOR PRONTO!"
echo "======================================"
echo ""
echo "  🔗 Porta: $PORT"
echo "  📍 Local: http://localhost:$PORT"

if [ ! -z "$NGROK_URL" ]; then
    echo "  🌐 Público: $NGROK_URL"
    echo ""
    echo "  Cole no WhisperTranscriber.swift:"
    echo "    static let serverURL = \"$NGROK_URL\""
else
    echo "  ⚠️  URL ngrok não disponível"
fi

echo ""
echo "  Pressione Ctrl+C para parar"
echo "======================================"
echo ""

# Trap para Ctrl+C
trap "echo ''; echo 🛑 Parando...; kill $SERVER_PID $NGROK_PID 2>/dev/null; exit 0" SIGINT

# Aguarda servidor
wait $SERVER_PID 2>/dev/null || true
