#!/bin/bash

# Script para iniciar PitchMVP completo
# Frontend Vue 3 + Backend Python

echo "🚀 Iniciando PitchMVP - Frontend Vue 3 + Backend Python"
echo "=================================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para verificar se porta está em uso
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        return 0
    else
        return 1
    fi
}

# Verificar se backend está rodando
echo "🔍 Verificando backend..."
if check_port 8000; then
    echo -e "${GREEN}✅ Backend já rodando na porta 8000${NC}"
    BACKEND_PID=""
else
    echo -e "${YELLOW}📦 Iniciando backend Python...${NC}"
    cd /home/victor/pitchmvp-server
    python3 main.py &
    BACKEND_PID=$!
    echo -e "${GREEN}✅ Backend iniciado (PID: $BACKEND_PID)${NC}"
    
    # Aguardar backend iniciar
    echo -e "${YELLOW}⏳ Aguardando backend inicializar...${NC}"
    sleep 3
fi

# Verificar se frontend está rodando
echo "🔍 Verificando frontend..."
if check_port 5173; then
    echo -e "${GREEN}✅ Frontend já rodando na porta 5173${NC}"
    FRONTEND_PID=""
else
    echo -e "${YELLOW}📦 Iniciando frontend Vue 3...${NC}"
    cd /home/victor/pitchmvp-server/frontend
    npm run dev &
    FRONTEND_PID=$!
    echo -e "${GREEN}✅ Frontend iniciado (PID: $FRONTEND_PID)${NC}"
    
    # Aguardar frontend iniciar
    echo -e "${YELLOW}⏳ Aguardando frontend inicializar...${NC}"
    sleep 5
fi

# Verificar se ambos estão online
echo ""
echo "🔍 Verificando status final..."

# Verificar backend
if curl -s http://localhost:8000/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend online: http://localhost:8000${NC}"
else
    echo -e "${RED}❌ Backend offline${NC}"
fi

# Verificar frontend
if curl -s http://localhost:5173 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend online: http://localhost:5173${NC}"
else
    echo -e "${RED}❌ Frontend offline${NC}"
fi

echo ""
echo "🎯 PitchMVP está pronto!"
echo "======================="
echo -e "${GREEN}🎵 Frontend Vue 3: http://localhost:5173${NC}"
echo -e "${GREEN}🐍 Backend Python:  http://localhost:8000${NC}"
echo ""
echo "📋 Funcionalidades disponíveis:"
echo "  • 🎤 Gravação de áudio"
echo "  • 🎯 Detecção de pitch em tempo real"
echo "  • 📊 Gráfico de frequência"
echo "  • 🎼 Display de notas"
echo "  • 📡 API integration"
echo ""
echo "🛑 Para parar: Ctrl+C"
echo ""

# Manter script rodando
if [ ! -z "$BACKEND_PID" ] || [ ! -z "$FRONTEND_PID" ]; then
    echo -e "${YELLOW}⏳ Mantendo servidores ativos...${NC}"
    
    # Trap para limpar processos ao sair
    trap 'echo ""; echo -e "${YELLOW}🛂 Parando servidores...${NC}"; 
          [ ! -z "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null; 
          [ ! -z "$FRONTEND_PID" ] && kill $FRONTEND_PID 2>/dev/null; 
          echo -e "${GREEN}✅ Servidores parados${NC}"; exit 0' INT
    
    # Aguardar indefinidamente
    wait
fi
