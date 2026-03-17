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
const currentFrequency = ref('0.00 Hz')
const currentConfidence = ref(0)
const isProcessing = ref(false)

// Gráfico
const canvasRef = ref(null)
const pitchHistory = ref([])
const maxHistoryLength = 100

let animationFrame = null

async function initializePitchDetection() {
  try {
    if (isInitialized.value) return true
    
    isProcessing.value = true
    errorMessage.value = ''
    
    console.log('🔄 Inicializando detecção de pitch local...')
    
    // Inicializar Web Audio API
    const initialized = await init()
    if (initialized) {
      isInitialized.value = true
      console.log('✅ Web Audio API inicializado com sucesso')
      return true
    } else {
      throw new Error('Falha ao inicializar Web Audio API')
    }
  } catch (error) {
    console.error('❌ Erro ao inicializar:', error)
    errorMessage.value = `Erro ao inicializar detecção: ${error.message}`
    return false
  } finally {
    isProcessing.value = false
  }
}

async function startRealtimeDetection() {
  try {
    errorMessage.value = ''
    
    if (!isInitialized.value) {
      const success = await initializePitchDetection()
      if (!success) {
        throw new Error('Não foi possível inicializar a detecção')
      }
    }
    
    console.log('🎤 Iniciando microfone...')
    
    // Iniciar microfone
    const stream = await start()
    if (!stream) {
      throw new Error('Não foi possível acessar o microfone')
    }
    
    console.log('🎯 Iniciando detecção de pitch...')
    
    // Iniciar detecção de pitch
    await startDetection(stream, voiceGender.value, (result) => {
      // Atualizar store
      try {
        pitchStore.updatePitch(result)
        
        // Atualizar estado local
        currentFrequency.value = `${result.frequency.toFixed(2)} Hz`
        currentConfidence.value = result.confidence
        
        // Adicionar ao histórico do gráfico
        if (result.frequency > 0) {
          pitchHistory.value.push({
            frequency: result.frequency,
            note: result.note,
            timestamp: Date.now()
          })
          
          // Manter apenas os últimos N pontos
          if (pitchHistory.value.length > maxHistoryLength) {
            pitchHistory.value.shift()
          }
        }
        
        // Atualizar gráfico
        updateChart()
        
        if (result.frequency > 0) {
          console.log('🎵 Pitch detectado:', result.note, result.frequency.toFixed(2) + 'Hz')
        }
      } catch (storeError) {
        console.warn('⚠️ Erro ao atualizar store:', storeError)
      }
    })
    
    // Iniciar loop de animação
    startAnimationLoop()
    
    console.log('✅ Detecção em tempo real iniciada com sucesso')
    
  } catch (error) {
    console.error('❌ Erro ao iniciar detecção:', error)
    errorMessage.value = `Erro ao iniciar: ${error.message}`
  }
}

function stopRealtimeDetection() {
  try {
    console.log('⏹️ Parando detecção...')
    
    stopDetection()
    stop()
    stopAnimationLoop()
    pitchStore.stopDetection()
    
    // Resetar estado
    currentFrequency.value = '0.00 Hz'
    currentConfidence.value = 0
    
    console.log('✅ Detecção parada com sucesso')
    
  } catch (error) {
    console.error('❌ Erro ao parar detecção:', error)
  }
}

function startAnimationLoop() {
  const animate = () => {
    if (isDetecting.value) {
      // Obter dados do áudio (opcional, para visualização)
      try {
        const audioData = getAudioData()
        // Processar dados se necessário
      } catch (error) {
        // Ignorar erros de áudio
      }
      
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

function updateChart() {
  if (!canvasRef.value) {
    console.log('⚠️ Canvas não disponível')
    return
  }
  
  if (pitchHistory.value.length === 0) {
    console.log('⚠️ Nenhum dado de pitch para desenhar')
    return
  }
  
  console.log('📊 Atualizando gráfico com', pitchHistory.value.length, 'pontos')
  
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  const width = canvas.width
  const height = canvas.height
  
  // Limpa canvas
  ctx.clearRect(0, 0, width, height)
  
  // Configuração do gráfico
  const padding = 40
  const graphWidth = width - padding * 2
  const graphHeight = height - padding * 2
  
  // Encontra frequências mínima e máxima
  const frequencies = pitchHistory.value.map(p => p.frequency).filter(f => f > 0)
  if (frequencies.length === 0) {
    console.log('⚠️ Nenhuma frequência válida encontrada')
    return
  }
  
  const minFreq = Math.min(...frequencies)
  const maxFreq = Math.max(...frequencies)
  const freqRange = maxFreq - minFreq || 1
  
  console.log('📊 Range de frequência:', minFreq.toFixed(1), '-', maxFreq.toFixed(1), 'Hz')
  
  // Desenha grade
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
  ctx.lineWidth = 1
  
  // Linhas horizontais
  for (let i = 0; i <= 5; i++) {
    const y = padding + (graphHeight / 5) * i
    ctx.beginPath()
    ctx.moveTo(padding, y)
    ctx.lineTo(width - padding, y)
    ctx.stroke()
    
    // Labels de frequência
    const freq = maxFreq - (freqRange / 5) * i
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.font = '10px monospace'
    ctx.textAlign = 'right'
    ctx.fillText(freq.toFixed(0) + ' Hz', padding - 5, y + 3)
  }
  
  // Linhas verticais
  for (let i = 0; i <= 10; i++) {
    const x = padding + (graphWidth / 10) * i
    ctx.beginPath()
    ctx.moveTo(x, padding)
    ctx.lineTo(x, height - padding)
    ctx.stroke()
  }
  
  // Desenha linha do pitch
  if (pitchHistory.value.length > 1) {
    ctx.strokeStyle = '#4CAF50'
    ctx.lineWidth = 2
    ctx.beginPath()
    
    pitchHistory.value.forEach((point, index) => {
      if (point.frequency <= 0) return
      
      const x = padding + (graphWidth / maxHistoryLength) * index
      const y = padding + graphHeight - ((point.frequency - minFreq) / freqRange) * graphHeight
      
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    
    ctx.stroke()
    
    // Desenha pontos
    ctx.fillStyle = '#4CAF50'
    pitchHistory.value.forEach((point, index) => {
      if (point.frequency <= 0) return
      
      const x = padding + (graphWidth / maxHistoryLength) * index
      const y = padding + graphHeight - ((point.frequency - minFreq) / freqRange) * graphHeight
      
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fill()
    })
    
    console.log('✅ Gráfico desenhado com sucesso')
  }
  
  // Título
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.font = '14px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Pitch em Tempo Real', width / 2, 20)
}

function goHome() {
  if (isDetecting.value) {
    stopRealtimeDetection()
  }
  router.push('/')
}

// Função para resetar erros
function clearError() {
  errorMessage.value = ''
}

onMounted(async () => {
  console.log('🔄 Montando componente RealtimePitch...')
  await initializePitchDetection()
  
  // Verifica se o canvas está disponível
  if (canvasRef.value) {
    console.log('✅ Canvas disponível no mounted')
    // Inicializa o canvas com fundo escuro
    const canvas = canvasRef.value
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  } else {
    console.log('⚠️ Canvas não disponível no mounted')
  }
})

onUnmounted(() => {
  console.log('🔄 Desmontando componente RealtimePitch...')
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
          <h2>🎵 Status da Detecção</h2>
          
          <!-- Status de Inicialização -->
          <div class="status-item">
            <div class="status-indicator">
              <div 
                class="status-dot" 
                :class="{ 
                  'active': isInitialized, 
                  'loading': isProcessing,
                  'error': !!errorMessage 
                }"
              ></div>
              <span>
                {{ isProcessing ? 'Inicializando...' : (isInitialized ? 'Pronto' : 'Não inicializado') }}
              </span>
            </div>
          </div>
          
          <!-- Status de Detecção -->
          <div class="status-item">
            <div class="status-indicator">
              <div 
                class="status-dot" 
                :class="{ 'active': isDetecting }"
              ></div>
              <span>{{ isDetecting ? 'Detectando' : 'Inativo' }}</span>
            </div>
          </div>
          
          <!-- Status do Microfone -->
          <div class="status-item">
            <div class="status-indicator">
              <div 
                class="status-dot" 
                :class="{ 'active': isMicrophoneActive }"
              ></div>
              <span>{{ isMicrophoneActive ? 'Microfone Ativo' : 'Microfone Inativo' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Pitch Display -->
      <div class="pitch-display">
        <div class="current-note">
          <div class="note-value">{{ pitchStore.currentNoteWithOctave }}</div>
          <div class="note-frequency">{{ currentFrequency || pitchStore.frequencyFormatted }}</div>
        </div>
        
        <div class="pitch-details">
          <div class="detail-item">
            <span class="detail-label">Confiança:</span>
            <span class="detail-value">{{ Math.round((currentConfidence || pitchStore.confidence) * 100) }}%</span>
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

      <!-- Visualization -->
      <div class="visualization-section">
        <div class="viz-card">
          <h3>📊 Gráfico de Pitch</h3>
          <div class="chart-wrapper">
            <canvas 
              ref="canvasRef"
              width="800" 
              height="300"
              class="pitch-chart"
            ></canvas>
            <div v-if="pitchHistory.length === 0" class="chart-status">
              Aguardando dados de pitch...
            </div>
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
              :disabled="isDetecting || isProcessing"
              class="start-btn"
            >
              {{ isProcessing ? 'Inicializando...' : (isDetecting ? 'Detectando...' : 'Iniciar Detecção') }}
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

      <!-- Error Message -->
      <div v-if="errorMessage" class="error-message">
        <span class="error-icon">❌</span>
        <span class="error-text">{{ errorMessage }}</span>
        <button @click="clearError" class="clear-error-btn">×</button>
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
.visualization-section {
  display: flex;
  justify-content: center;
  margin: 2rem 0;
}

.status-card,
.control-card,
.viz-card {
  background: rgba(255, 255, 255, 0.95);
  padding: 2rem;
  border-radius: 16px;
  backdrop-filter: blur(10px);
  width: 100%;
  max-width: 400px;
}

.viz-card {
  max-width: 900px;
}

.status-card h2,
.control-card h3,
.viz-card h3 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: #333;
  text-align: center;
}

.chart-wrapper {
  position: relative;
  width: 100%;
  height: 300px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  padding: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.pitch-chart {
  width: 100%;
  height: 100%;
  border-radius: 8px;
}

.chart-status {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: rgba(255, 255, 255, 0.7);
  font-size: 1.1rem;
  font-weight: 500;
  text-align: center;
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

.status-dot.loading {
  background: #ff9800;
  animation: spin 1s infinite;
}

.status-dot.error {
  background: #f44336;
  animation: blink 0.5s infinite;
}

.status-item {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
}

.status-item:last-child {
  margin-bottom: 0;
}

.clear-error-btn {
  margin-left: auto;
  background: none;
  border: none;
  color: #f44336;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-error-btn:hover {
  background: rgba(244, 67, 54, 0.1);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes blink {
  0%, 50%, 100% { opacity: 1; }
  25%, 75% { opacity: 0.5; }
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
  
  .chart-wrapper {
    height: 250px;
    padding: 0.5rem;
  }
  
  .viz-card {
    padding: 1rem;
    max-width: 100%;
  }
  
  .status-card,
  .control-card {
    padding: 1rem;
  }
}
</style>
