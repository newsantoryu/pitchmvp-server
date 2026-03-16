# PitchMVP - Frontend Vue 3 + Vite

## 🚀 Migração Concluída com Sucesso!

Frontend migrado do HTML monolítico para Vue 3 + Vite seguindo arquitetura moderna.

## 📁 Estrutura do Projeto

```
frontend/
├── src/
│   ├── components/          # Componentes Vue
│   │   ├── Recorder.vue    # Botão de gravação
│   │   ├── PitchDisplay.vue # Display de notas
│   │   ├── StatusBar.vue   # Status e progresso
│   │   └── PitchGraph.vue  # Gráfico de pitch
│   ├── composables/        # Hooks Vue
│   │   ├── useMicrophone.js # Gestão de microfone
│   │   └── usePitch.js     # Detecção de pitch
│   ├── services/           # Serviços de API
│   │   └── api.js         # Comunicação com backend
│   ├── App.vue            # Componente principal
│   ├── main.js            # Ponto de entrada
│   └── style.css          # Estilos globais
├── index.html             # HTML template
├── vite.config.js         # Config Vite
└── package.json           # Dependências
```

## 🛠️ Tecnologias Utilizadas

- **Vue 3.4.0** - Framework JavaScript reativo
- **Vite 5.0.0** - Build tool e dev server
- **Essentia.js** - Processamento de áudio e pitch detection
- **FastAPI** - Backend Python (existente)

## 🎯 Funcionalidades Migradas

### ✅ Componentes Vue
- **Recorder.vue** - Botão gravar/parar com timer
- **PitchDisplay.vue** - Display de notas em tempo real
- **StatusBar.vue** - Status do sistema e progresso
- **PitchGraph.vue** - Gráfico de frequência ao vivo

### ✅ Hooks Personalizados
- **useMicrophone()** - Controle de stream de áudio
- **usePitch()** - Detecção de pitch com Essentia.js

### ✅ Serviço de API
- **api.js** - Comunicação com backend Python
- Endpoints: `/health`, `/pitch/transcribe-file`, `/pitch/job/{id}`

## 🚀 Como Usar

### 1. Iniciar Backend
```bash
cd /home/victor/pitchmvp-server
python3 main.py
```
Backend: `http://localhost:8000`

### 2. Iniciar Frontend
```bash
cd /home/victor/pitchmvp-server/frontend
npm install
npm run dev
```
Frontend: `http://localhost:5173`

### 3. Usar o Sistema
1. Acesse `http://localhost:5173`
2. Clique em "Gravar" para iniciar captura
3. Veja pitch detection em tempo real
4. Monitore status e gráfico

## 🔧 Desenvolvimento

### Adicionar Novos Componentes
```vue
<!-- src/components/NovoComponente.vue -->
<script setup>
// Lógica do componente
</script>

<template>
  <!-- HTML do componente -->
</template>

<style scoped>
/* Estilos do componente */
</style>
```

### Usar Hooks
```javascript
import { useMicrophone } from './composables/useMicrophone.js'

const { isRecording, start, stop } = useMicrophone()
```

### Chamadas API
```javascript
import { transcribe, health } from './services/api.js'

const healthStatus = await health()
const result = await transcribe(file)
```

## 📊 Proxy Vite (CORS)

O Vite está configurado com proxy para evitar CORS:

```javascript
// vite.config.js
server: {
  proxy: {
    "/api": {
      target: "http://localhost:8000",
      changeOrigin: true
    }
  }
}
```

Frontend chama: `/api/transcribe-file`
Backend recebe: `http://localhost:8000/pitch/transcribe-file`

## 🏗️ Build para Produção

```bash
npm run build
```

Gera pasta `dist/` com arquivos otimizados.

## 🔄 Comparação: Antes vs Depois

| HTML Antigo | Vue 3 Novo |
|-------------|-------------|
| 42KB monolítico | Componentes modulares |
| JavaScript vanilla | Vue Composition API |
| Classes CSS | Scoped CSS |
| Callbacks | Eventos reativos |
| DOM manual | Virtual DOM |

## 🎵 Features Implementadas

- ✅ **Gravação de Áudio** - Com permissão e timer
- ✅ **Pitch Detection** - Essentia.js em tempo real
- ✅ **Display de Notas** - Conversão freq→nota
- ✅ **Gráfico em Tempo Real** - Canvas animado
- ✅ **Status System** - Feedback visual
- ✅ **API Integration** - Backend Python
- ✅ **Responsive Design** - Mobile-friendly

## 🚀 Próximos Passos

1. **Upload de Arquivos** - Componente para upload
2. **Results View** - Exibir transcrições
3. **Score System** - Cifras e partituras
4. **Realtime Pitch** - Modos local/remoto
5. **Export Features** - PDF, compartilhamento

## 🎯 Benefícios da Migração

- **Performance** - Virtual DOM, lazy loading
- **Manutenibilidade** - Componentes reutilizáveis
- **Escalabilidade** - Arquitetura modular
- **Developer Experience** - Hot reload, TypeScript ready
- **Modern Stack** - Vue 3, ES6+, Vite

---

**Status**: ✅ Migração concluída e funcional!
