<script setup>
import { ref, onMounted } from 'vue'
import UploadView from './views/UploadView.vue'
import UrlView from './views/UrlView.vue'
import MicView from './views/MicView.vue'

// Estado da navegação
const currentTab = ref('upload')
const isProcessing = ref(false)
const progress = ref(0)

// Dados das features
const features = ref([
  {
    id: 'upload',
    name: 'Upload',
    icon: '📁',
    description: 'Envie um arquivo de áudio'
  },
  {
    id: 'url',
    name: 'URL',
    icon: '🔗',
    description: 'Use uma URL do Supabase'
  },
  {
    id: 'mic',
    name: 'Gravar',
    icon: '🎤',
    description: 'Grave áudio direto'
  }
])

// Funções de navegação
function switchTab(tabId) {
  currentTab.value = tabId
  console.log(`🔄 Navegou para: ${tabId}`)
}

// Funções das features
async function handleUpload(file) {
  console.log('📁 Upload recebido:', file.name)
  await simulateProcessing('Upload')
}

async function handleUrl(url) {
  console.log('🔗 URL recebida:', url)
  await simulateProcessing('URL')
}

async function handleRecording(audioFile) {
  console.log('🎤 Gravação recebida:', audioFile.name)
  await simulateProcessing('Gravação')
}

async function simulateProcessing(type) {
  isProcessing.value = true
  progress.value = 0
  
  for (let i = 0; i <= 100; i += 10) {
    progress.value = i
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  
  console.log(`✅ ${type} processado com sucesso`)
  isProcessing.value = false
  progress.value = 0
}

// Inicialização
onMounted(() => {
  console.log('🧭 Sistema de navegação carregado')
})
</script>

<template>
  <div class="app">
    <!-- Header com navegação -->
    <header class="app-header">
      <div class="header-content">
        <div class="logo">
          <h1>🎵 PitchMVP</h1>
          <p>Sistema de detecção de pitch</p>
        </div>
        
        <!-- Abas de navegação -->
        <nav class="tab-navigation">
          <div 
            v-for="feature in features" 
            :key="feature.id"
            :class="['tab', { 'active': currentTab === feature.id }]"
            @click="switchTab(feature.id)"
          >
            <span class="tab-icon">{{ feature.icon }}</span>
            <span class="tab-name">{{ feature.name }}</span>
          </div>
        </nav>
      </div>
    </header>

    <!-- Barra de progresso -->
    <div v-if="isProcessing" class="progress-container">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
        <span class="progress-text">{{ progress }}%</span>
      </div>
      <p class="progress-message">Processando...</p>
    </div>

    <!-- Conteúdo principal -->
    <main class="app-main">
      <!-- Upload View -->
      <UploadView 
        v-if="currentTab === 'upload'"
        @upload-complete="handleUpload"
      />

      <!-- URL View -->
      <UrlView 
        v-if="currentTab === 'url'"
        @url-submit="handleUrl"
      />

      <!-- Microfone View -->
      <MicView 
        v-if="currentTab === 'mic'"
        @recording-complete="handleRecording"
      />
    </main>

    <!-- Footer -->
    <footer class="app-footer">
      <div class="footer-content">
        <p>Frontend Vue 3 + Vite | Backend Python FastAPI</p>
        <div class="footer-links">
          <a href="http://localhost:8000" target="_blank" class="api-link">
            📍 API: http://localhost:8000
          </a>
          <a href="#" class="docs-link">📚 Docs</a>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.app-header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

.logo {
  text-align: center;
  margin-bottom: 1.5rem;
}

.logo h1 {
  font-size: 2.5rem;
  color: #2196f3;
  margin: 0;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
}

.logo p {
  color: #666;
  font-size: 1.1rem;
  margin: 0.5rem 0 0 0;
}

.tab-navigation {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  padding: 0.5rem;
  border-radius: 16px;
  backdrop-filter: blur(5px);
}

.tab {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
  position: relative;
  overflow: hidden;
}

.tab::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #2196f3, #4caf50);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.tab:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.tab.active::before {
  opacity: 1;
}

.tab.active {
  color: white;
  border-color: transparent;
}

.tab-icon {
  font-size: 1.3rem;
  position: relative;
  z-index: 1;
}

.tab-name {
  position: relative;
  z-index: 1;
}

.progress-container {
  text-align: center;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.95);
  margin: 2rem auto;
  max-width: 600px;
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.progress-bar {
  position: relative;
  height: 8px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 1rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #2196f3, #4caf50);
  transition: width 0.3s ease;
  position: relative;
}

.progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  animation: shimmer 2s infinite;
}

.progress-text {
  position: absolute;
  top: -25px;
  right: 0;
  font-size: 0.9rem;
  color: #666;
  font-weight: 600;
}

.progress-message {
  margin: 0;
  color: #666;
  font-weight: 500;
}

.app-main {
  flex: 1;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.app-footer {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  padding: 2rem 0;
  margin-top: auto;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  text-align: center;
}

.footer-content p {
  color: #666;
  margin: 0 0 1rem 0;
}

.footer-links {
  display: flex;
  justify-content: center;
  gap: 2rem;
  flex-wrap: wrap;
}

.api-link, .docs-link {
  color: #2196f3;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s ease;
}

.api-link:hover, .docs-link:hover {
  color: #1976d2;
  transform: translateY(-1px);
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

@media (max-width: 768px) {
  .app-header {
    padding: 0.5rem 0;
  }
  
  .header-content {
    padding: 0 1rem;
  }
  
  .logo h1 {
    font-size: 2rem;
  }
  
  .tab-navigation {
    gap: 0.25rem;
    padding: 0.25rem;
  }
  
  .tab {
    padding: 0.75rem 1rem;
    flex: 1;
    justify-content: center;
  }
  
  .tab-name {
    display: none;
  }
  
  .tab-icon {
    font-size: 1.5rem;
  }
  
  .app-main {
    padding: 1rem;
  }
  
  .progress-container {
    margin: 1rem;
    padding: 1rem;
  }
  
  .footer-links {
    flex-direction: column;
    gap: 1rem;
  }
}

@media (max-width: 480px) {
  .logo h1 {
    font-size: 1.8rem;
  }
  
  .logo p {
    font-size: 1rem;
  }
  
  .tab-icon {
    font-size: 1.2rem;
  }
}
</style>
