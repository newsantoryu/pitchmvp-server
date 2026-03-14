#!/bin/bash
set -e
echo "=== PitchMVP Transcription Server Setup ==="

echo "[1/5] Verificando Python 3.11..."
if ! command -v python3.11 &> /dev/null; then
    sudo apt update && sudo apt install -y python3.11 python3.11-venv python3.11-dev
fi

echo "[2/5] Verificando ffmpeg e libsndfile..."
sudo apt install -y ffmpeg libsndfile1

echo "[3/5] Criando ambiente virtual..."
python3.11 -m venv venv
source venv/bin/activate

echo "[4/5] Instalando dependências Python..."
pip install --upgrade pip
pip install -r requirements.txt

echo "[5/5] Instalando ngrok..."
if ! command -v ngrok &> /dev/null; then
    curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc \
        | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
    echo "deb https://ngrok-agent.s3.amazonaws.com buster main" \
        | sudo tee /etc/apt/sources.list.d/ngrok.list
    sudo apt update && sudo apt install -y ngrok
fi

echo ""
echo "Setup concluído!"
echo "  1. ngrok config add-authtoken SEU_TOKEN"
echo "  2. ./start.sh"