#!/bin/bash

# Script de diagnóstico para PitchMVP Frontend Vue 3

echo "🔍 DIAGNÓSTICO: PitchMVP Frontend Vue 3"
echo "========================================"

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}📋 Verificando estrutura do projeto...${NC}"

# Verificar estrutura de arquivos
if [ -d "/home/victor/pitchmvp-server/frontend/src" ]; then
    echo -e "${GREEN}✅ Pasta src encontrada${NC}"
else
    echo -e "${RED}❌ Pasta src não encontrada${NC}"
fi

# Verificar componentes
components=("Recorder.vue" "PitchDisplay.vue" "StatusBar.vue" "PitchGraph.vue")
for comp in "${components[@]}"; do
    if [ -f "/home/victor/pitchmvp-server/frontend/src/components/$comp" ]; then
        echo -e "${GREEN}✅ Componente: $comp${NC}"
    else
        echo -e "${RED}❌ Componente ausente: $comp${NC}"
    fi
done

# Verificar composables
composables=("useMicrophone.js" "usePitch.js")
for comp in "${composables[@]}"; do
    if [ -f "/home/victor/pitchmvp-server/frontend/src/composables/$comp" ]; then
        echo -e "${GREEN}✅ Composable: $comp${NC}"
    else
        echo -e "${RED}❌ Composable ausente: $comp${NC}"
    fi
done

# Verificar serviços
if [ -f "/home/victor/pitchmvp-server/frontend/src/services/api.js" ]; then
    echo -e "${GREEN}✅ Serviço API encontrado${NC}"
else
    echo -e "${RED}❌ Serviço API ausente${NC}"
fi

echo ""
echo -e "${BLUE}🔍 Verificando dependências...${NC}"

cd /home/victor/pitchmvp-server/frontend

# Verificar node_modules
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ node_modules existe${NC}"
else
    echo -e "${RED}❌ node_modules não existe - Execute: npm install${NC}"
fi

# Verificar package.json
if [ -f "package.json" ]; then
    echo -e "${GREEN}✅ package.json encontrado${NC}"
    echo -e "${YELLOW}📦 Dependências:${NC}"
    grep -E '"vue"|"vite"|"@vitejs/plugin-vue"' package.json || echo -e "${RED}❌ Dependências principais não encontradas${NC}"
else
    echo -e "${RED}❌ package.json não encontrado${NC}"
fi

echo ""
echo -e "${BLUE}🔍 Verificando configuração...${NC}"

# Verificar vite.config.js
if [ -f "vite.config.js" ]; then
    echo -e "${GREEN}✅ vite.config.js encontrado${NC}"
    if grep -q "host.*0.0.0.0" vite.config.js; then
        echo -e "${GREEN}✅ Configurado para aceitar conexões externas${NC}"
    else
        echo -e "${YELLOW}⚠️ Não configurado para conexões externas${NC}"
    fi
else
    echo -e "${RED}❌ vite.config.js não encontrado${NC}"
fi

echo ""
echo -e "${BLUE}🚀 Testando build...${NC}"

npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build bem-sucedido${NC}"
    echo -e "${YELLOW}📁 Arquivos gerados em dist/${NC}"
    ls -la dist/ | head -5
else
    echo -e "${RED}❌ Build falhou${NC}"
fi

echo ""
echo -e "${BLUE}🔍 Verificando portas...${NC}"

# Verificar portas em uso
if command -v lsof >/dev/null 2>&1; then
    if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Porta 5173 em uso (frontend)${NC}"
    else
        echo -e "${YELLOW}⚠️ Porta 5173 livre${NC}"
    fi
    
    if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Porta 8000 em uso (backend)${NC}"
    else
        echo -e "${YELLOW}⚠️ Porta 8000 livre${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ lsof não disponível para verificar portas${NC}"
fi

echo ""
echo -e "${BLUE}🌐 Testando conexões...${NC}"

# Testar backend
if curl -s http://localhost:8000/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend respondendo: http://localhost:8000${NC}"
else
    echo -e "${RED}❌ Backend não respondendo${NC}"
fi

# Testar frontend (se estiver rodando)
if curl -s http://localhost:5173 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend respondendo: http://localhost:5173${NC}"
else
    echo -e "${YELLOW}⚠️ Frontend não rodando (inicie com npm run dev)${NC}"
fi

echo ""
echo -e "${BLUE}📋 Sugestões:${NC}"
echo "1. Se frontend não rodar: cd frontend && npm run dev"
echo "2. Se build falhar: npm install e tente novamente"
echo "3. Se backend não responder: python3 main.py"
echo "4. Acesse: http://localhost:5173 (Vue) ou http://192.168.15.65:5173"
echo ""
echo -e "${GREEN}🎯 Diagnóstico concluído!${NC}"
