#!/bin/bash

# Script de diagnóstico para páginas Vue 3

echo "🔍 DIAGNÓSTICO: Páginas Vue 3"
echo "=================================="

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "📁 Verificando estrutura de arquivos..."

# Verificar estrutura essencial
files=(
    "src/main.js"
    "src/App.vue"
    "src/router/index.js"
    "src/pages/Home-simple.vue"
    "src/pages/Upload-simple.vue"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file${NC}"
    else
        echo -e "${RED}❌ $file (faltando)${NC}"
    fi
done

echo ""
echo "🌐 Verificando servidor..."

# Verificar se o servidor está rodando
if curl -s http://localhost:5174 > /dev/null; then
    echo -e "${GREEN}✅ Servidor rodando em http://localhost:5174${NC}"
    
    # Testar páginas
    echo ""
    echo "📄 Testando páginas..."
    
    pages=(
        "/"
        "/upload"
        "/realtime-pitch"
        "/transcription"
        "/scores"
        "/results"
    )
    
    for page in "${pages[@]}"; do
        if curl -s "http://localhost:5174$page" | grep -q "<!DOCTYPE html\|<html"; then
            echo -e "${GREEN}✅ $page - OK${NC}"
        else
            echo -e "${RED}❌ $page - ERRO${NC}"
        fi
    done
else
    echo -e "${RED}❌ Servidor não está rodando${NC}"
    echo -e "${YELLOW}💡 Execute: npm run dev${NC}"
fi

echo ""
echo "📦 Verificando dependências..."

# Verificar pacotes instalados
packages=(
    "vue"
    "vue-router"
    "pinia"
)

for package in "${packages[@]}"; do
    if npm list "$package" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $package instalado${NC}"
    else
        echo -e "${RED}❌ $package não instalado${NC}"
    fi
done

echo ""
echo "🔧 Verificando configuração..."

# Verificar vite.config.js
if [ -f "vite.config.js" ]; then
    echo -e "${GREEN}✅ vite.config.js existe${NC}"
    
    if grep -q "host.*0\.0\.0\.0" vite.config.js; then
        echo -e "${GREEN}✅ Configuração de host externa OK${NC}"
    else
        echo -e "${YELLOW}⚠️  Configuração de host externa não encontrada${NC}"
    fi
else
    echo -e "${RED}❌ vite.config.js não encontrado${NC}"
fi

echo ""
echo "🚀 Como acessar:"
echo "==============="
echo -e "${BLUE}📍 Home:${NC}           http://localhost:5174/"
echo -e "${BLUE}📍 Upload:${NC}         http://localhost:5174/upload"
echo -e "${BLUE}📍 Realtime:${NC}       http://localhost:5174/realtime-pitch"
echo -e "${BLUE}📍 Transcription:${NC}  http://localhost:5174/transcription"
echo -e "${BLUE}📍 Scores:${NC}         http://localhost:5174/scores"
echo -e "${BLUE}📍 Results:${NC}        http://localhost:5174/results"

echo ""
echo "🔍 Se as páginas não estiverem funcionando:"
echo "1. Abra o console do navegador (F12)"
echo "2. Procure erros vermelhos"
echo "3. Verifique se há erros de importação"
echo "4. Execute este script novamente"

echo ""
echo "✅ Diagnóstico concluído!"
