<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePitchStore } from '../stores/pitchStore.js'
import { useMicrophone } from '../composables/useMicrophone.js'
import { usePitch } from '../composables/usePitchDetection.js'

const router = useRouter()
const pitchStore = usePitchStore()

const { isMicrophoneActive, start, stop, getAudioData } = useMicrophone()
const { currentPitch, currentNote, isDetecting, init, startDetection, stopDetection } = usePitch()

const isInitialized = ref(false)
const errorMessage = ref('')
const voiceGender = ref('auto')

let animationFrame = null

async function initializePitchDetection() {
  try {
    const initialized = await init()
    if (initialized) {
      isInitialized.value = true
      console.log('🎵 Essentia.js inicializado')
    }
  } catch (error) {
    console.error('❌ Erro ao inicializar:', error)
    errorMessage.value = 'Erro ao inicializar detecção de pitch'
  }
}

async function startRealtimeDetection() {
  try {
    if (!isInitialized.value) {
      await initializePitchDetection()
    }
    
    // Iniciar microfone
    const stream = await start()
    
    // Iniciar detecção de pitch
    await startDetection(stream, voiceGender.value, (result) => {
      // Atualizar store
      pitchStore.updatePitch(result)
    })
    
    // Iniciar loop de animação
    startAnimationLoop()
    
    console.log('🎯 Detecção em tempo real iniciada')
    
  } catch (error) {
    console.error('❌ Erro ao iniciar detecção:', error)
    errorMessage.value = error.message
  }
}

function stopRealtimeDetection() {
  stopDetection()
  stop()
  stopAnimationLoop()
  pitchStore.stopDetection()
  console.log('⏹️ Detecção em tempo real parada')
}

function startAnimationLoop() {
  const animate = () => {
    if (isDetecting.value) {
      // Obter dados do áudio (opcional, para visualização)
      const audioData = getAudioData()
      // Processar dados se necessário
      
      animationFrame = requestAnimationFrame(animate)
    }
  }
  animate()
}

function stopAnimationLoop() {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
    animationFrame = null
  }
}

function goHome() {
  if (isDetecting.value) {
    stopRealtimeDetection()
  }
  router.push('/')
}

onMounted(async () => {
  await initializePitchDetection()
})

onUnmounted(() => {
  stopRealtimeDetection()
})
</script>

<template>
  <div class="realtime-pitch-page">
    <!-- Header -->
    <header class="page-header">
      <button @click="goHome" class="back-btn">← Home</button>
      <h1>🎯 Pitch em Tempo Real</h1>
    </header>

    <!-- Main Content -->
    <main class="realtime-content">
      <!-- Status -->
      <div class="status-section">
        <div class="status-card">
          <h2>🎵 Detecção Ativa</h2>
          <div class="status-indicator">
            <div 
              class="status-dot" 
              :class="{ 'active': isDetecting }"
            ></div>
            <span>{{ isDetecting ? 'Detectando' : 'Inativo' }}</span>
          </div>
        </div>
      </div>

      <!-- Pitch Display -->
      <div class="pitch-display">
        <div class="current-note">
          <div class="note-value">{{ pitchStore.currentNoteWithOctave }}</div>
          <div class="note-frequency">{{ pitchStore.frequencyFormatted }}</div>
        </div>
        
        <div class="pitch-details">
          <div class="detail-item">
            <span class="detail-label">Confiança:</span>
            <span class="detail-value">{{ Math.round(pitchStore.confidence * 100) }}%</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Precisão:</span>
            <span 
              class="detail-value" 
              :style="{ color: pitchStore.accuracyColor }"
            >
              {{ pitchStore.accuracy }}
            </span>
          </div>
        </div>
      </div>

      <!-- Controls -->
      <div class="controls-section">
        <div class="control-card">
          <h3>⚙️ Configurações</h3>
          <div class="setting-group">
            <label>
              <span>Gênero Vocal:</span>
              <select v-model="voiceGender" :disabled="isDetecting">
                <option value="auto">Auto</option>
                <option value="male">Masculino</option>
                <option value="female">Feminino</option>
              </select>
            </label>
          </div>
          
          <div class="control-actions">
            <button 
              @click="startRealtimeDetection"
              :disabled="isDetecting || !isInitialized"
              class="start-btn"
            >
              {{ isDetecting ? 'Detectando...' : 'Iniciar Detecção' }}
            </button>
            
            <button 
              @click="stopRealtimeDetection"
              :disabled="!isDetecting"
              class="stop-btn"
            >
              Parar
            </button>
          </div>
        </div>
      </div>

      <!-- Visualization -->
      <div class="visualization-section">
        <div class="viz-card">
          <h3>📊 Visualização</h3>
          <div class="pitch-visualization">
            <!-- Frequência Meter -->
            <div class="frequency-meter">
              <div class="meter-label">Frequência</div>
              <div class="meter-bar">
                <div 
                  class="meter-fill" 
                  :style="{ 
                    width: Math.min((pitchStore.frequency / 1000) * 100, 100) + '%' 
                  }"
                ></div>
              </div>
              <div class="meter-value">{{ pitchStore.frequencyFormatted }}</div>
            </div>
            
            <!-- Confidence Meter -->
            <div class="confidence-meter">
              <div class="meter-label">Confiança</div>
              <div class="meter-bar">
                <div 
                  class="meter-fill confidence" 
                  :style="{ width: (pitchStore.confidence * 100) + '%' }"
                ></div>
              </div>
              <div class="meter-value">{{ Math.round(pitchStore.confidence * 100) }}%</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-section" v-if="pitchStore.pitchHistory.length > 0">
        <div class="stats-card">
          <h3>📈 Estatísticas da Sessão</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">Amostras:</span>
              <span class="stat-value">{{ pitchStore.stats.totalSamples }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Média:</span>
              <span class="stat-value">{{ pitchStore.stats.averageFrequency.toFixed(1) }} Hz</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Nota mais comum:</span>
              <span class="stat-value">{{ pitchStore.stats.mostFrequentNote || '-' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="errorMessage" class="error-message">
        <span class="error-icon">❌</span>
        <span class="error-text">{{ errorMessage }}</span>
      </div>

      <!-- Info -->
      <div class="info-section">
        <div class="info-item">
          <span class="info-icon">💡</span>
          <span class="info-text">
            Use um microfone de boa qualidade para melhores resultados
          </span>
        </div>
        <div class="info-item">
          <span class="info-icon">🎵</span>
          <span class="info-text">
            Cante ou toque um instrumento musical
          </span>
        </div>
        <div class="info-item">
          <span class="info-icon">🔇</span>
          <span class="info-text">
            Ambiente silencioso melhora a precisão
          </span>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.realtime-pitch-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  color: white;
}

.back-btn {
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.page-header h1 {
  font-size: 2rem;
  margin: 0;
}

.realtime-content {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.status-section,
.controls-section,
.visualization-section,
.stats-section {
  display: flex;
  justify-content: center;
}

.status-card,
.control-card,
.viz-card,
.stats-card {
  background: rgba(255, 255, 255, 0.95);
  padding: 2rem;
  border-radius: 16px;
  backdrop-filter: blur(10px);
  width: 100%;
  max-width: 400px;
}

.status-card h2,
.control-card h3,
.viz-card h3,
.stats-card h3 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: #333;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #f44336;
  transition: all 0.3s ease;
}

.status-dot.active {
  background: #4caf50;
  animation: pulse 1.5s infinite;
}

.pitch-display {
  background: rgba(255, 255, 255, 0.95);
  padding: 2rem;
  border-radius: 16px;
  backdrop-filter: blur(10px);
  text-align: center;
}

.current-note {
  margin-bottom: 2rem;
}

.note-value {
  font-size: 4rem;
  font-weight: 800;
  color: #2196f3;
  margin-bottom: 0.5rem;
}

.note-frequency {
  font-size: 1.5rem;
  color: #666;
  font-family: monospace;
}

.pitch-details {
  display: flex;
  justify-content: center;
  gap: 2rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.detail-label {
  font-size: 0.9rem;
  color: #666;
}

.detail-value {
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
}

.setting-group {
  margin-bottom: 1.5rem;
}

.setting-group label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #333;
}

.setting-group select {
  padding: 0.5rem 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: white;
}

.control-actions {
  display: flex;
  gap: 1rem;
}

.start-btn {
  flex: 1;
  padding: 1rem;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.start-btn:hover:not(:disabled) {
  background: #45a049;
  transform: translateY(-2px);
}

.start-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
}

.stop-btn {
  padding: 1rem 2rem;
  background: #f44336;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.stop-btn:hover:not(:disabled) {
  background: #d32f2f;
  transform: translateY(-2px);
}

.stop-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
}

.pitch-visualization {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.frequency-meter,
.confidence-meter {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.meter-label {
  font-size: 0.9rem;
  color: #666;
}

.meter-bar {
  width: 100%;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.meter-fill {
  height: 100%;
  background: linear-gradient(90deg, #2196f3, #4caf50);
  transition: width 0.1s ease;
}

.meter-fill.confidence {
  background: linear-gradient(90deg, #ff9800, #4caf50);
}

.meter-value {
  font-family: monospace;
  font-weight: 600;
  color: #333;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.stat-item {
  text-align: center;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.stat-label {
  display: block;
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.25rem;
}

.stat-value {
  display: block;
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: 8px;
  color: #f44336;
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: white;
  font-size: 0.9rem;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(76, 175, 80, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
  }
}

@media (max-width: 768px) {
  .realtime-pitch-page {
    padding: 1rem;
  }
  
  .page-header h1 {
    font-size: 1.5rem;
  }
  
  .note-value {
    font-size: 3rem;
  }
  
  .pitch-details {
    flex-direction: column;
    gap: 1rem;
  }
  
  .control-actions {
    flex-direction: column;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
}
</style>
