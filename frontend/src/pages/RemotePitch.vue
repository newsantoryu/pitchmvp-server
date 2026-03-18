<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePitchStore } from '../stores/pitchStore.js'
import { useMicrophone } from '../composables/useMicrophone.js'
import { transcribeFrame } from '../services/api.js'
import { retryWithConfig } from '../utils/retry.js'

const router = useRouter()
const pitchStore = usePitchStore()

const isReceiving = ref(false)
const remotePitch = ref(0)
const remoteNote = ref('-')
const remoteConfidence = ref(0)
const errorMessage = ref('')
const connectionStatus = ref('Aguardando microfone...')
const isSilent = ref(true)
const volumeLevel = ref(0)

// Dados completos do pitch core
const pitchData = ref({
  frequency: 0,
  note: '-',
  cents: 0,
  confidence: 0,
  periodicity: 0,
  voiced: false,
  voice_analysis: {},
  sample_rate: 0,
  hop_length: 0,
  frame_time: 0,
  processing_mode: '',
  range_info: {}
})

const { isMicrophoneActive, start, stop, stream } = useMicrophone()
let analysisInterval = null
let audioContext = null
let analyser = null
let microphoneStream = null
let silenceTimeout = null

// Estado de loading para feedback visual
const isStarting = ref(false)
const isStopping = ref(false)

// Gráfico em tempo real
const canvasRef = ref(null)
const pitchHistory = ref([])
const maxHistoryLength = 100

// Configurações de detecção de silêncio
const SILENCE_THRESHOLD = 0.01  // Limiar de volume para considerar silêncio
const SILENCE_DELAY = 1000     // 1 segundo de silêncio antes de parar

function detectSilence() {
  if (!analyser) return
  
  const bufferLength = analyser.frequencyBinCount
  const dataArray = new Uint8Array(bufferLength)
  analyser.getByteTimeDomainData(dataArray)
  
  // Calcular RMS (Root Mean Square) para detectar volume
  let sum = 0
  for (let i = 0; i < bufferLength; i++) {
    const normalized = (dataArray[i] - 128) / 128.0
    sum += normalized * normalized
  }
  const rms = Math.sqrt(sum / bufferLength)
  volumeLevel.value = rms
  
  // Detectar silêncio
  const currentlySilent = rms < SILENCE_THRESHOLD
  
  if (currentlySilent !== isSilent.value) {
    isSilent.value = currentlySilent
    
    if (currentlySilent) {
      // Iniciar timeout para parar análise
      silenceTimeout = setTimeout(() => {
        if (isSilent.value && isReceiving.value) {
          console.log('🔇 Silêncio detectado, pausando análise')
          connectionStatus.value = 'Aguardando som...'
          // Não para completamente, apenas pausa o envio
        }
      }, SILENCE_DELAY)
    } else {
      // Cancelar timeout se houver som
      if (silenceTimeout) {
        clearTimeout(silenceTimeout)
        silenceTimeout = null
      }
      connectionStatus.value = 'Analisando em tempo real...'
    }
  }
}

async function sendFrameToAPI() {
  try {
    if (!microphoneStream || !analyser) {
      console.log('Microfone ou analisador não disponível')
      return
    }

    // Detectar silêncio antes de processar
    detectSilence()
    
    // Pular envio se estiver em silêncio
    if (isSilent.value) {
      return
    }

    // Capturar amostras do microfone
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    analyser.getByteTimeDomainData(dataArray)

    // Converter para float32 samples (formato esperado pela API)
    const samples = new Float32Array(dataArray.length)
    for (let i = 0; i < dataArray.length; i++) {
      samples[i] = (dataArray[i] - 128) / 128.0 // Normalizar para [-1, 1]
    }

    // Enviar para API usando camada de API e estado mínimo
    pitchStore.setLoading(true)
    try {
      const result = await retryWithConfig(async () => {
        return await transcribeFrame(
          Array.from(samples), 
          audioContext ? audioContext.sampleRate : 44100
        )
      }, 'NETWORK')
      
      // Atualizar dados completos do pitch core
      pitchData.value = {
        frequency: result.frequency || 0,
        note: result.note || '-',
        cents: result.cents || 0,
        confidence: result.confidence || 0,
        periodicity: result.periodicity || 0,
        voiced: result.voiced || false,
        voice_analysis: result.voice_analysis || {},
      sample_rate: result.sample_rate || 44100,
      hop_length: result.hop_length || 0,
      frame_time: result.frame_time || 0.01,
      processing_mode: result.processing_mode || '',
      range_info: result.range_info || {}
    }
    
    // Atualizar display com os dados principais
    remotePitch.value = result.frequency || 0
    remoteNote.value = result.note || '-'
    remoteConfidence.value = result.confidence || 0
    isReceiving.value = true
    connectionStatus.value = 'Recebendo dados...'
    
    // Adicionar ao histórico do gráfico
    pitchHistory.value.push({
      time: Date.now(),
      frequency: result.frequency || 0,
      note: result.note || '-',
      confidence: result.confidence || 0,
      voice_type: result.voice_analysis?.voice_type || 'unknown'
    })
    
    // Sucesso - atualizar estado do pitchStore
    pitchStore.setResult(result)
    
    } catch (error) {
      console.error('❌ Erro ao processar áudio:', error)
      errorMessage.value = error.message || 'Erro ao processar áudio'
      connectionStatus.value = 'Erro na conexão'
      pitchStore.setError(error.message || 'Erro ao processar áudio')
    }
    
    // Manter apenas os últimos N pontos
    if (pitchHistory.value.length > maxHistoryLength) {
      pitchHistory.value.shift()
    }
    
    // Atualizar gráfico
    updateChart()
    
    // Atualiza store com tratamento de erro
    try {
      if (pitchStore.setFrequency && typeof pitchStore.setFrequency === 'function') {
        pitchStore.setFrequency(result.frequency || 0)
      }
      if (pitchStore.setNote && typeof pitchStore.setNote === 'function') {
        pitchStore.setNote(result.note || '-')
      }
      if (pitchStore.setConfidence && typeof pitchStore.setConfidence === 'function') {
        pitchStore.setConfidence(result.confidence || 0)
      }
      if (pitchStore.setDetecting && typeof pitchStore.setDetecting === 'function') {
        pitchStore.setDetecting(true)
      }
    } catch (storeError) {
      console.warn('⚠️ Erro ao atualizar store:', storeError)
      // Não interrompe o processo, apenas loga o erro
    }

  } catch (error) {
    console.error('❌ Erro ao enviar frame para API:', error)
    errorMessage.value = 'Erro ao processar áudio: ' + error.message
    connectionStatus.value = 'Erro de processamento'
  }
}

function updateChart() {
  if (!canvasRef.value || pitchHistory.value.length === 0) return
  
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  const width = canvas.width
  const height = canvas.height
  
  // Limpar canvas
  ctx.clearRect(0, 0, width, height)
  
  // Configurar estilo
  ctx.strokeStyle = '#4CAF50'
  ctx.lineWidth = 2
  ctx.fillStyle = 'rgba(76, 175, 80, 0.1)'
  
  // Encontrar min/max para scaling
  const frequencies = pitchHistory.value.map(p => p.frequency).filter(f => f > 0)
  if (frequencies.length === 0) return
  
  const minFreq = Math.min(...frequencies)
  const maxFreq = Math.max(...frequencies)
  const freqRange = maxFreq - minFreq || 1
  
  // Desenhar área preenchida
  ctx.beginPath()
  pitchHistory.value.forEach((point, index) => {
    const x = (index / (maxHistoryLength - 1)) * width
    const y = height - ((point.frequency - minFreq) / freqRange) * height * 0.8 - height * 0.1
    
    if (index === 0) {
      ctx.moveTo(x, height)
      ctx.lineTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  })
  
  // Completar área
  ctx.lineTo(((pitchHistory.value.length - 1) / (maxHistoryLength - 1)) * width, height)
  ctx.closePath()
  ctx.fill()
  
  // Desenhar linha
  ctx.beginPath()
  pitchHistory.value.forEach((point, index) => {
    const x = (index / (maxHistoryLength - 1)) * width
    const y = height - ((point.frequency - minFreq) / freqRange) * height * 0.8 - height * 0.1
    
    if (index === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  })
  ctx.stroke()
  
  // Desenhar labels de frequência
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
  ctx.font = '12px monospace'
  ctx.fillText(`${minFreq.toFixed(0)} Hz`, 5, height - 5)
  ctx.fillText(`${maxFreq.toFixed(0)} Hz`, 5, 15)
  
  // Desenhar nota atual se houver
  if (pitchHistory.value.length > 0) {
    const lastPoint = pitchHistory.value[pitchHistory.value.length - 1]
    if (lastPoint.note && lastPoint.note !== '-') {
      ctx.fillStyle = '#FF9800'
      ctx.font = 'bold 16px monospace'
      ctx.fillText(lastPoint.note, width - 40, 25)
    }
  }
}

async function startRealtimeAnalysis() {
  try {
    isStarting.value = true
    errorMessage.value = ''
    
    // Inicializar contexto de áudio
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)()
    }
    
    // Iniciar microfone com retry
    microphoneStream = await retryWithConfig(async () => {
      return await start()
    }, 'MICROPHONE')
    
    // Configurar analyser
    const source = audioContext.createMediaStreamSource(microphoneStream)
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 2048
    source.connect(analyser)

    isReceiving.value = true
    connectionStatus.value = 'Analisando em tempo real...'
    
    // Limpar histórico
    pitchHistory.value = []
    
    // Enviar frames para API periodicamente
    analysisInterval = setInterval(() => {
      sendFrameToAPI()
    }, 100) // 100ms = 10fps (similar ao hop_length da API)

  } catch (error) {
    console.error('❌ Erro ao iniciar análise:', error)
    errorMessage.value = 'Erro ao iniciar análise: ' + error.message
    connectionStatus.value = 'Erro ao iniciar'
  } finally {
    isStarting.value = false
  }
}

function stopRealtimeAnalysis() {
  try {
    isStopping.value = true
    
    if (analysisInterval) {
      clearInterval(analysisInterval)
      analysisInterval = null
    }
    
    if (silenceTimeout) {
      clearTimeout(silenceTimeout)
      silenceTimeout = null
    }
    
    if (microphoneStream) {
      stop()
      microphoneStream = null
    }
    
    if (audioContext) {
      audioContext.close()
      audioContext = null
    }
    
    isReceiving.value = false
    connectionStatus.value = 'Análise parada'
    pitchData.value = null
    remotePitch.value = 0
    remoteNote.value = '-'
    remoteConfidence.value = 0
    
  } catch (error) {
    console.error('❌ Erro ao parar análise:', error)
  } finally {
    isStopping.value = false
  }
}

function goHome() {
  stopRealtimeAnalysis()
  router.push('/')
}

onMounted(() => {
  console.log('🎯 Remote Pitch page montada')
})

onUnmounted(() => {
  stopRealtimeAnalysis()
})
</script>

<template>
  <div class="remote-pitch-page">
    <!-- Header -->
    <header class="page-header">
      <button @click="goHome" class="back-btn">← Home</button>
      <h1>🌐 Pitch Remoto</h1>
      <div class="connection-indicator" :class="{ connected: isReceiving, disconnected: !isReceiving }">
        <span class="status-dot"></span>
        {{ connectionStatus }}
      </div>
    </header>

    <!-- Main Content -->
    <main class="main-content">
      <!-- API Status -->
      <section class="api-section">
        <div class="api-status">
          <h2>📡 Status da Conexão</h2>
          <div class="status-info">
            <div class="endpoint-info">
              <strong>Endpoint:</strong> POST /api/v1/pitch-realtime/transcribe-frame-json
            </div>
            <div class="status-message">
              {{ connectionStatus }}
            </div>
          </div>
        </div>
      </section>

      <!-- Controls -->
      <section class="controls-section">
        <div class="controls">
          <h2>🎤 Controles do Microfone</h2>
          <div class="control-buttons">
            <button 
              @click="startRealtimeAnalysis" 
              :disabled="isReceiving || isStarting"
              class="btn btn-success btn-large"
            >
              {{ isStarting ? 'Iniciando...' : '🎤 Iniciar Análise' }}
            </button>
            <button 
              @click="stopRealtimeAnalysis" 
              :disabled="!isReceiving || isStopping"
              class="btn btn-danger btn-large"
            >
              {{ isStopping ? 'Parando...' : '🛑 Parar Análise' }}
            </button>
          </div>
          
          <!-- Volume Indicator -->
          <div class="volume-indicator" v-if="isReceiving">
            <div class="volume-header">
              <span>🔊 Volume</span>
              <span class="volume-value">{{ Math.round(volumeLevel * 100) }}%</span>
            </div>
            <div class="volume-bar">
              <div 
                class="volume-fill" 
                :class="{ 'volume-silent': isSilent, 'volume-active': !isSilent }"
                :style="{ width: (volumeLevel * 100) + '%' }"
              ></div>
            </div>
            <div class="volume-status" :class="{ 'status-silent': isSilent, 'status-active': !isSilent }">
              <span class="status-dot"></span>
              {{ isSilent ? '🔇 Silêncio detectado' : '🎵 Som detectado' }}
            </div>
          </div>
        </div>
      </section>

      <!-- Real-time Chart -->
      <section class="chart-section">
        <div class="chart-container">
          <h2>📈 Pitch em Tempo Real</h2>
          <div class="chart-wrapper">
            <canvas 
              ref="canvasRef"
              width="800"
              height="200"
              class="pitch-chart"
            ></canvas>
          </div>
          <div class="chart-info">
            <span class="chart-legend">Frequência (Hz) ao longo do tempo</span>
            <span class="chart-status" v-if="isReceiving">
              🎵 Nota atual: {{ remoteNote }}
            </span>
          </div>
        </div>
      </section>

      <!-- Remote Pitch Display -->
      <section class="pitch-display-section">
        <div class="pitch-display">
          <h2>🎵 Detalhes do Pitch</h2>
          
          <!-- Frequency Display -->
          <div class="frequency-display">
            <div class="frequency-value">
              <span class="number">{{ remotePitch.toFixed(2) }}</span>
              <span class="unit">Hz</span>
            </div>
            <div class="frequency-label">Frequência</div>
          </div>

          <!-- Note Display -->
          <div class="note-display">
            <div class="note-value">{{ remoteNote }}</div>
            <div class="note-label">Nota Musical</div>
          </div>

          <!-- Confidence Meter -->
          <div class="confidence-section">
            <div class="confidence-header">
              <span>Confiança</span>
              <span class="confidence-value">{{ Math.round(remoteConfidence * 100) }}%</span>
            </div>
            <div class="confidence-bar">
              <div 
                class="confidence-fill" 
                :style="{ width: (remoteConfidence * 100) + '%' }"
              ></div>
            </div>
          </div>

          <!-- Status Indicator -->
          <div class="status-indicator" :class="{ detecting: isReceiving, idle: !isReceiving }">
            <span class="status-dot"></span>
            {{ isReceiving ? 'Analisando...' : 'Parado' }}
          </div>
        </div>
      </section>

      <!-- Pitch Core Data Section -->
      <section class="pitch-core-section" v-if="isReceiving && pitchData.frequency > 0">
        <div class="pitch-core-data">
          <h2>🔬 Pitch Core Data</h2>
          
          <!-- Voice Analysis -->
          <div class="voice-analysis-grid">
            <div class="analysis-card">
              <h3>🎤 Análise Vocal</h3>
              <div class="analysis-item">
                <span class="label">Tipo de Voz:</span>
                <span class="value">{{ pitchData.voice_analysis?.voice_type || 'unknown' }}</span>
              </div>
              <div class="analysis-item">
                <span class="label">Range:</span>
                <span class="value">{{ pitchData.voice_analysis?.range || 'unknown' }}</span>
              </div>
              <div class="analysis-item">
                <span class="label">Qualidade:</span>
                <span class="value quality-badge" :class="pitchData.voice_analysis?.quality || 'poor'">
                  {{ pitchData.voice_analysis?.quality || 'poor' }}
                </span>
              </div>
              <div class="analysis-item">
                <span class="label">Estabilidade:</span>
                <span class="value stability-badge" :class="pitchData.voice_analysis?.stability || 'unstable'">
                  {{ pitchData.voice_analysis?.stability || 'unstable' }}
                </span>
              </div>
            </div>

            <!-- Musical Info -->
            <div class="analysis-card">
              <h3>🎼 Informações Musicais</h3>
              <div class="analysis-item">
                <span class="label">Oitava:</span>
                <span class="value">{{ pitchData.voice_analysis?.octave || 0 }}</span>
              </div>
              <div class="analysis-item">
                <span class="label">MIDI Note:</span>
                <span class="value">{{ pitchData.voice_analysis?.midi_note || 0 }}</span>
              </div>
              <div class="analysis-item">
                <span class="label">Cents:</span>
                <span class="value">{{ pitchData.cents || 0 }}</span>
              </div>
              <div class="analysis-item">
                <span class="label">Voiced:</span>
                <span class="value voiced-badge" :class="{ voiced: pitchData.voiced, unvoiced: !pitchData.voiced }">
                  {{ pitchData.voiced ? 'Yes' : 'No' }}
                </span>
              </div>
            </div>

            <!-- Processing Info -->
            <div class="analysis-card">
              <h3>⚙️ Processamento</h3>
              <div class="analysis-item">
                <span class="label">Sample Rate:</span>
                <span class="value">{{ pitchData.sample_rate }} Hz</span>
              </div>
              <div class="analysis-item">
                <span class="label">Frame Time:</span>
                <span class="value">{{ (pitchData.frame_time * 1000).toFixed(1) }} ms</span>
              </div>
              <div class="analysis-item">
                <span class="label">Hop Length:</span>
                <span class="value">{{ pitchData.hop_length }}</span>
              </div>
              <div class="analysis-item">
                <span class="label">Mode:</span>
                <span class="value">{{ pitchData.processing_mode || 'unknown' }}</span>
              </div>
            </div>

            <!-- Advanced Analysis -->
            <div class="analysis-card">
              <h3>📊 Análise Avançada</h3>
              <div class="analysis-item">
                <span class="label">Periodicity:</span>
                <span class="value">{{ (pitchData.periodicity * 100).toFixed(1) }}%</span>
              </div>
              <div class="analysis-item">
                <span class="label">Formant F1:</span>
                <span class="value">{{ Math.round(pitchData.voice_analysis?.formants?.f1 || 0) }} Hz</span>
              </div>
              <div class="analysis-item">
                <span class="label">Formant F2:</span>
                <span class="value">{{ Math.round(pitchData.voice_analysis?.formants?.f2 || 0) }} Hz</span>
              </div>
              <div class="analysis-item">
                <span class="label">Vogal Estimada:</span>
                <span class="value vowel-badge">{{ pitchData.voice_analysis?.formants?.vowel_estimate || '-' }}</span>
              </div>
            </div>
          </div>

          <!-- Harmonics Section -->
          <div class="harmonics-section" v-if="pitchData.voice_analysis?.harmonics?.harmonics?.length">
            <h3>🎵 Harmônicos</h3>
            <div class="harmonics-grid">
              <div 
                v-for="harmonic in pitchData.voice_analysis.harmonics.harmonics" 
                :key="harmonic.order"
                class="harmonic-item"
              >
                <span class="harmonic-order">H{{ harmonic.order }}</span>
                <span class="harmonic-freq">{{ Math.round(harmonic.frequency) }} Hz</span>
                <span class="harmonic-amp">{{ (harmonic.amplitude * 100).toFixed(1) }}%</span>
              </div>
            </div>
          </div>

          <!-- Range Info -->
          <div class="range-info-section">
            <h3>📈 Análise de Range</h3>
            <div class="range-grid">
              <div class="range-item">
                <span class="label">Range Atual:</span>
                <span class="value">{{ pitchData.range_info?.current_range || 'unknown' }}</span>
              </div>
              <div class="range-item">
                <span class="label">Range Ótimo:</span>
                <span class="value">{{ pitchData.range_info?.optimal_range || 'auto' }}</span>
              </div>
              <div class="range-item">
                <span class="label">Dentro do Range:</span>
                <span class="value range-badge" :class="{ in_range: pitchData.range_info?.is_in_range, out_range: !pitchData.range_info?.is_in_range }">
                  {{ pitchData.range_info?.is_in_range ? 'Yes' : 'No' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Error Display -->
      <section v-if="errorMessage" class="error-section">
        <div class="error-message">
          <span class="error-icon">❌</span>
          {{ errorMessage }}
        </div>
      </section>

      <!-- Instructions -->
      <section class="instructions-section">
        <div class="instructions">
          <h3>📖 Como Funciona</h3>
          <ol>
            <li>Clique em "Iniciar Análise" para ativar o microfone</li>
            <li>O microfone captura áudio em tempo real</li>
            <li>Os dados são enviados para a API via POST</li>
            <li>A API processa e retorna a frequência e nota</li>
            <li>O gráfico mostra o pitch ao longo do tempo</li>
            <li>Clique em "Parar Análise" quando terminar</li>
          </ol>
          
          <div class="api-note">
            <h4>🔧 API de Transmissão</h4>
            <p>A página envia dados do microfone para a API:</p>
            <pre class="code-block">
POST /transcribe-frame-json
Content-Type: application/json

{
  "samples": [0.1, -0.2, 0.3, ...],
  "sample_rate": 44100
}</pre>
            
            <p><strong>Resposta da API:</strong></p>
            <pre class="code-block">
{
  "note": "A4",
  "freq": 440.0,
  "cents": 0
}</pre>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.remote-pitch-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
  color: white;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
}

.back-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.page-header h1 {
  font-size: 2.5rem;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.connection-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 600;
}

.connection-indicator.connected {
  background: rgba(76, 175, 80, 0.3);
  border: 1px solid #4CAF50;
}

.connection-indicator.disconnected {
  background: rgba(244, 67, 54, 0.3);
  border: 1px solid #f44336;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.main-content {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  gap: 2rem;
}

.api-section,
.controls-section,
.chart-section,
.pitch-display-section,
.error-section,
.instructions-section {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.api-status h2,
.controls h2,
.chart-container h2,
.pitch-display h2,
.instructions h3 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
}

.chart-wrapper {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow-x: auto;
}

.pitch-chart {
  display: block;
  max-width: 100%;
  height: auto;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
}

.chart-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
}

.chart-legend {
  font-style: italic;
}

.chart-status {
  font-weight: 600;
  color: #FF9800;
}

.status-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.endpoint-info {
  font-family: 'Courier New', monospace;
  background: rgba(0, 0, 0, 0.2);
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.status-message {
  font-size: 1.1rem;
  font-weight: 600;
}

.control-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-success {
  background: #4CAF50;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #45a049;
}

.btn-danger {
  background: #f44336;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #da190b;
}

.btn-large {
  padding: 1rem 2rem;
  font-size: 1.1rem;
}

.volume-indicator {
  margin-top: 2rem;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.volume-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  font-weight: 600;
}

.volume-value {
  color: #4CAF50;
  font-family: 'Courier New', monospace;
}

.volume-bar {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.volume-fill {
  height: 100%;
  transition: all 0.3s ease;
  border-radius: 4px;
}

.volume-silent {
  background: #9E9E9E;
}

.volume-active {
  background: linear-gradient(90deg, #4CAF50, #8BC34A);
}

.volume-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  transition: all 0.3s ease;
}

.status-silent {
  background: rgba(158, 158, 158, 0.2);
  color: #9E9E9E;
}

.status-active {
  background: rgba(76, 175, 80, 0.2);
  color: #4CAF50;
}

.volume-status .status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Pitch Core Data Styles */
.pitch-core-section {
  margin: 2rem 0;
}

.pitch-core-data {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.pitch-core-data h2 {
  color: #fff;
  font-size: 1.5rem;
  margin-bottom: 2rem;
  text-align: center;
}

.voice-analysis-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.analysis-card {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.analysis-card h3 {
  color: #fff;
  font-size: 1.1rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.analysis-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.analysis-item:last-child {
  border-bottom: none;
}

.analysis-item .label {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
}

.analysis-item .value {
  color: #fff;
  font-weight: 600;
  font-family: 'Courier New', monospace;
}

.quality-badge.excellent {
  background: rgba(76, 175, 80, 0.3);
  color: #4CAF50;
}

.quality-badge.good {
  background: rgba(33, 150, 243, 0.3);
  color: #2196F3;
}

.quality-badge.fair {
  background: rgba(255, 193, 7, 0.3);
  color: #FFC107;
}

.quality-badge.poor {
  background: rgba(244, 67, 54, 0.3);
  color: #F44336;
}

.pitch-display {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.frequency-display,
.note-display {
  text-align: center;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.frequency-value {
  font-size: 4rem;
  font-weight: 700;
  color: #4CAF50;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.frequency-value .unit {
  font-size: 2rem;
  color: rgba(255, 255, 255, 0.8);
  margin-left: 0.5rem;
}

.frequency-label,
.note-label {
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 0.5rem;
}

.note-value {
  font-size: 5rem;
  font-weight: 700;
  color: #FF9800;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.confidence-section {
  background: rgba(255, 255, 255, 0.05);
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.confidence-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  font-weight: 600;
}

.confidence-value {
  color: #4CAF50;
}

.confidence-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  overflow: hidden;
}

.confidence-fill {
  height: 100%;
  background: linear-gradient(90deg, #f44336, #FF9800, #4CAF50);
  transition: width 0.3s ease;
}

.status-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 8px;
  font-weight: 600;
  text-align: center;
}

.status-indicator.detecting {
  background: rgba(76, 175, 80, 0.2);
  border: 1px solid #4CAF50;
}

.status-indicator.idle {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.error-section {
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.3);
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #ff6b6b;
  font-weight: 600;
}

.instructions {
  color: rgba(255, 255, 255, 0.9);
}

.instructions ol {
  padding-left: 1.5rem;
  line-height: 1.8;
}

.instructions li {
  margin-bottom: 0.5rem;
}

.api-note {
  margin-top: 2rem;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.api-note h4 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #FF9800;
}

.api-note p {
  margin-bottom: 1rem;
  line-height: 1.6;
}

.code-block {
  background: rgba(0, 0, 0, 0.3);
  padding: 1rem;
  border-radius: 6px;
  overflow-x: auto;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  color: #4CAF50;
  border: 1px solid rgba(76, 175, 80, 0.3);
}

@media (max-width: 768px) {
  .remote-pitch-page {
    padding: 1rem;
  }
  
  .page-header {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
  
  .page-header h1 {
    font-size: 2rem;
  }
  
  .frequency-value {
    font-size: 3rem;
  }
  
  .note-value {
    font-size: 4rem;
  }
}
</style>
