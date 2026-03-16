#!/bin/bash

# Script simplificado para iniciar frontend Vue 3

echo "🚀 Iniciando Frontend Vue 3 - PitchMVP"
echo "===================================="

cd /home/victor/pitchmvp-server/frontend

echo "📦 Verificando dependências..."
if [ ! -d "node_modules" ]; then
    echo "📥 Instalando dependências..."
    npm install
fi

echo "🔧 Iniciando servidor de desenvolvimento..."
echo "📍 Frontend: http://localhost:5173"
echo "📍 Network: http://192.168.15.65:5173"
echo ""
echo "⚠️  Se não conseguir acessar, tente:"
echo "   - http://localhost:5173"
echo "   - http://127.0.0.1:5173"
echo "   - http://192.168.15.65:5173"
echo ""
echo "🛑 Para parar: Ctrl+C"
echo ""

npm run dev
