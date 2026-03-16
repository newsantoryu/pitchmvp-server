<script setup>
import { ref, onMounted } from 'vue'

// Estado da navegação
const currentTab = ref('upload')
const activeView = ref('main')
const isProcessing = ref(false)
const progress = ref(0)

// Dados das features
const features = ref([
  {
    id: 'upload',
    name: 'Upload de Arquivo',
    icon: '📁',
    description: 'Envie um arquivo de áudio para análise',
    component: 'UploadView'
  },
  {
    id: 'url',
    name: 'URL Supabase',
    icon: '🔗',
    description: 'Use uma URL do Supabase para análise',
    component: 'UrlView'
  },
  {
    id: 'mic',
    name: 'Gravação',
    icon: '🎤',
    description: 'Grave áudio diretamente no navegador',
    component: 'MicView'
  },
  {
    id: 'realtime',
    name: 'Pitch em Tempo Real',
    icon: '🎯',
    description: 'Detecção de pitch ao vivo',
    component: 'RealtimeView'
  },
  {
    id: 'scores',
    name: 'Minhas Cifras',
    icon: '🎼',
    description: 'Visualize e gerencie suas cifras',
    component: 'ScoresView'
  },
  {
    id: 'results',
    name: 'Resultados',
    icon: '📊',
    description: 'Veja os resultados da análise',
    component: 'ResultsView'
  }
])

// Funções de navegação
function switchTab(tabId) {
  currentTab.value = tabId
  console.log(`🔄 Navegou para: ${tabId}`)
}

function showView(viewName) {
  activeView.value = viewName
  console.log(`👁️ View ativa: ${viewName}`)
}

function showMainView() {
  activeView.value = 'main'
  console.log('🏠 Voltou para view principal')
}

function showResultsView() {
  activeView.value = 'results'
  console.log('📊 Mostrando resultados')
}

function showScoresView() {
  activeView.value = 'scores'
  console.log('🎼 Mostrando cifras')
}

function showRealtimeView() {
  activeView.value = 'realtime'
  console.log('🎯 Mostrando pitch em tempo real')
}

// Funções das features
async function handleUpload(file) {
  isProcessing.value = true
  progress.value = 0
  
  try {
    // Simulação de upload
    for (let i = 0; i <= 100; i += 10) {
      progress.value = i
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    
    showResultsView()
    console.log('✅ Upload concluído')
  } catch (error) {
    console.error('❌ Erro no upload:', error)
  } finally {
    isProcessing.value = false
    progress.value = 0
  }
}

async function handleUrl(url) {
  isProcessing.value = true
  progress.value = 0
  
  try {
    // Simulação de processamento de URL
    for (let i = 0; i <= 100; i += 15) {
      progress.value = i
      await new Promise(resolve => setTimeout(resolve, 150))
    }
    
    showResultsView()
    console.log('✅ URL processada')
  } catch (error) {
    console.error('❌ Erro na URL:', error)
  } finally {
    isProcessing.value = false
    progress.value = 0
  }
}

function handleRecording() {
  showRealtimeView()
  console.log('🎤 Iniciando gravação')
}

function handleScores() {
  showScoresView()
  console.log('🎼 Abrindo cifras')
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
      <h1>🎵 PitchMVP - Vue 3</h1>
      <p>Sistema de detecção de pitch e análise musical</p>
      
      <!-- Abas de navegação -->
      <nav class="tab-navigation">
        <div 
          v-for="feature in features" 
          :key="feature.id"
          :class="['tab', { 'active': currentTab === feature.id }]"
          @click="switchTab(feature.id)"
        >
          <span class="tab-icon">{{ feature.icon }}</span>
          <span class="tab-text">{{ feature.name }}</span>
        </div>
      </nav>
    </header>

    <!-- Conteúdo principal -->
    <main class="app-main">
      <!-- Barra de progresso -->
      <div v-if="isProcessing" class="progress-bar">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
        <span class="progress-text">{{ progress }}%</span>
      </div>

      <!-- Views principais -->
      <div v-if="activeView === 'main'" class="main-content">
        <!-- Upload View -->
        <div v-if="currentTab === 'upload'" class="feature-view">
          <div class="feature-header">
            <h2>📁 Upload de Arquivo</h2>
            <p>Envie um arquivo de áudio (MP3, WAV, M4A) para análise de pitch</p>
          </div>
          
          <div class="upload-area">
            <input 
              type="file" 
              accept="audio/*" 
              @change="handleUpload($event.target.files[0])"
              class="file-input"
              id="file-upload"
            >
            <label for="file-upload" class="upload-label">
              <div class="upload-icon">📁</div>
              <div class="upload-text">
                <p>Clique para selecionar ou arraste o arquivo</p>
                <small>MP3, WAV, M4A (max 50MB)</small>
              </div>
            </label>
          </div>
        </div>

        <!-- URL View -->
        <div v-if="currentTab === 'url'" class="feature-view">
          <div class="feature-header">
            <h2>🔗 URL Supabase</h2>
            <p>Use uma URL do Supabase para analisar áudio remoto</p>
          </div>
          
          <div class="url-form">
            <input 
              type="url" 
              placeholder="https://*.supabase.co/storage/v1/object/*"
              class="url-input"
              v-model="urlInput"
            >
            <button 
              @click="handleUrl(urlInput)"
              :disabled="!urlInput || isProcessing"
              class="submit-btn"
            >
              {{ isProcessing ? 'Processando...' : 'Analisar' }}
            </button>
          </div>
        </div>

        <!-- Microfone View -->
        <div v-if="currentTab === 'mic'" class="feature-view">
          <div class="feature-header">
            <h2>🎤 Gravação</h2>
            <p>Grave áudio diretamente no navegador para análise imediata</p>
          </div>
          
          <div class="mic-controls">
            <button @click="handleRecording" class="record-btn">
              <span class="record-icon"></span>
              Iniciar Gravação
            </button>
            
            <div class="mic-settings">
              <label>
                <span>Qualidade:</span>
                <select class="quality-select">
                  <option value="low">Baixa</option>
                  <option value="medium" selected>Média</option>
                  <option value="high">Alta</option>
                </select>
              </label>
            </div>
          </div>
        </div>

        <!-- Realtime Pitch View -->
        <div v-if="currentTab === 'realtime'" class="feature-view">
          <div class="feature-header">
            <h2>🎯 Pitch em Tempo Real</h2>
            <p>Detecção de pitch ao vivo com Essentia.js</p>
          </div>
          
          <div class="realtime-controls">
            <button class="pitch-btn">Iniciar Detecção</button>
            <div class="pitch-display">
              <div class="current-note">-</div>
              <div class="current-freq">0.00 Hz</div>
            </div>
          </div>
        </div>

        <!-- Scores View -->
        <div v-if="currentTab === 'scores'" class="feature-view">
          <div class="feature-header">
            <h2>🎼 Minhas Cifras</h2>
            <p>Visualize, edite e exporte suas cifras musicais</p>
          </div>
          
          <div class="scores-list">
            <div class="score-item">
              <div class="score-info">
                <h3>Música Exemplo</h3>
                <p>3:45 • C Major • 95 BPM</p>
              </div>
              <div class="score-actions">
                <button class="action-btn">📄</button>
                <button class="action-btn">📥</button>
                <button class="action-btn">🗑️</button>
              </div>
            </div>
            
            <div class="empty-state" v-if="false">
              <div class="empty-icon">🎼</div>
              <p>Nenhuma cifra encontrada</p>
              <button class="create-btn">Criar Primeira Cifra</button>
            </div>
          </div>
        </div>

        <!-- Results View -->
        <div v-if="currentTab === 'results'" class="feature-view">
          <div class="feature-header">
            <h2>📊 Resultados</h2>
            <p>Análise completa de pitch e transcrição musical</p>
          </div>
          
          <div class="results-content">
            <div class="results-summary">
              <div class="summary-item">
                <span class="label">Duração:</span>
                <span class="value">3:45</span>
              </div>
              <div class="summary-item">
                <span class="label">Tom:</span>
                <span class="value">C Major</span>
              </div>
              <div class="summary-item">
                <span class="label">BPM:</span>
                <span class="value">95</span>
              </div>
            </div>
            
            <div class="pitch-chart">
              <h3>Gráfico de Pitch</h3>
              <div class="chart-placeholder">
                📈 Gráfico de frequência ao longo do tempo
              </div>
            </div>
            
            <div class="transcription">
              <h3>Transcrição</h3>
              <div class="transcription-content">
                <div class="note-line">
                  <span class="note">C4</span>
                  <span class="duration">1.5s</span>
                </div>
                <div class="note-line">
                  <span class="note">E4</span>
                  <span class="duration">1.0s</span>
                </div>
                <div class="note-line">
                  <span class="note">G4</span>
                  <span class="duration">2.0s</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Views secundárias -->
      <div v-else class="secondary-content">
        <!-- Conteúdo das views secundárias -->
        <div class="view-header">
          <button @click="showMainView" class="back-btn">← Voltar</button>
          <h2>{{ getViewTitle(activeView) }}</h2>
        </div>
        
        <div class="view-content">
          <p>Conteúdo da view {{ activeView }} em desenvolvimento...</p>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="app-footer">
      <p>Frontend Vue 3 + Vite | Backend Python FastAPI</p>
      <p>📍 API: <a href="http://localhost:8000" target="_blank">http://localhost:8000</a></p>
    </footer>
  </div>
</template>

<style scoped>
.app {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.app-header {
  text-align: center;
  margin-bottom: 2rem;
}

.app-header h1 {
  font-size: 2.5rem;
  color: #2196f3;
  margin-bottom: 0.5rem;
}

.app-header p {
  color: #666;
  font-size: 1.1rem;
  margin-bottom: 2rem;
}

.tab-navigation {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  background: #f5f5f5;
  padding: 0.5rem;
  border-radius: 12px;
  flex-wrap: wrap;
}

.tab {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
}

.tab:hover {
  background: #f8f9fa;
  transform: translateY(-1px);
}

.tab.active {
  background: #2196f3;
  color: white;
  border-color: #2196f3;
}

.tab-icon {
  font-size: 1.2rem;
}

.progress-bar {
  position: relative;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  margin-bottom: 2rem;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #2196f3, #4caf50);
  transition: width 0.3s ease;
}

.progress-text {
  position: absolute;
  top: -20px;
  right: 0;
  font-size: 0.8rem;
  color: #666;
}

.feature-view {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  border: 1px solid #e0e0e0;
}

.feature-header {
  text-align: center;
  margin-bottom: 2rem;
}

.feature-header h2 {
  font-size: 1.8rem;
  color: #333;
  margin-bottom: 0.5rem;
}

.feature-header p {
  color: #666;
  font-size: 1rem;
}

.upload-area {
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 3rem;
  text-align: center;
  transition: all 0.3s ease;
}

.upload-area:hover {
  border-color: #2196f3;
  background: #f8f9fa;
}

.file-input {
  display: none;
}

.upload-label {
  cursor: pointer;
  display: block;
}

.upload-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.upload-text p {
  font-size: 1.1rem;
  color: #333;
  margin-bottom: 0.5rem;
}

.upload-text small {
  color: #666;
}

.url-form {
  display: flex;
  gap: 1rem;
  max-width: 600px;
  margin: 0 auto;
}

.url-input {
  flex: 1;
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
}

.submit-btn {
  padding: 1rem 2rem;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}

.submit-btn:hover:not(:disabled) {
  background: #1976d2;
}

.submit-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.mic-controls {
  text-align: center;
}

.record-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem 3rem;
  background: #f44336;
  color: white;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  font-size: 1.1rem;
  font-weight: 600;
  transition: all 0.3s ease;
  margin-bottom: 2rem;
}

.record-btn:hover {
  background: #d32f2f;
  transform: scale(1.05);
}

.record-icon {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: white;
}

.mic-settings {
  display: flex;
  justify-content: center;
  gap: 2rem;
}

.quality-select {
  padding: 0.5rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

.realtime-controls {
  text-align: center;
}

.pitch-btn {
  padding: 1rem 2rem;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 2rem;
}

.pitch-display {
  display: flex;
  justify-content: center;
  gap: 2rem;
}

.current-note {
  font-size: 3rem;
  font-weight: bold;
  color: #4caf50;
}

.current-freq {
  font-size: 1.2rem;
  color: #666;
  font-family: monospace;
}

.scores-list {
  max-width: 800px;
  margin: 0 auto;
}

.score-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.score-info h3 {
  margin: 0 0 0.25rem 0;
  color: #333;
}

.score-info p {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
}

.score-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  padding: 0.5rem;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.create-btn {
  padding: 1rem 2rem;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 1rem;
}

.results-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.summary-item {
  text-align: center;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.label {
  display: block;
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
}

.value {
  display: block;
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
}

.pitch-chart, .transcription {
  margin-bottom: 2rem;
}

.pitch-chart h3, .transcription h3 {
  margin-bottom: 1rem;
  color: #333;
}

.chart-placeholder {
  background: #f8f9fa;
  padding: 3rem;
  text-align: center;
  color: #666;
  border-radius: 8px;
}

.transcription-content {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
}

.note-line {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e0e0e0;
}

.note-line:last-child {
  border-bottom: none;
}

.note {
  font-weight: 600;
  color: #2196f3;
}

.duration {
  color: #666;
  font-family: monospace;
}

.secondary-content {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  border: 1px solid #e0e0e0;
}

.view-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.back-btn {
  padding: 0.5rem 1rem;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
}

.app-footer {
  text-align: center;
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid #e0e0e0;
  color: #666;
}

.app-footer a {
  color: #2196f3;
  text-decoration: none;
}

.app-footer a:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .app {
    padding: 0.5rem;
  }
  
  .tab-navigation {
    gap: 0.25rem;
    padding: 0.25rem;
  }
  
  .tab {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }
  
  .tab-text {
    display: none;
  }
  
  .url-form {
    flex-direction: column;
  }
  
  .pitch-display {
    flex-direction: column;
    gap: 1rem;
  }
  
  .results-summary {
    grid-template-columns: 1fr;
  }
}
</style>
