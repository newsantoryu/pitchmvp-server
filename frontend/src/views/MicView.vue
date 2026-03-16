<script setup>
import { ref, onUnmounted } from 'vue'
import { useRecorder } from '../composables/useRecorder.js'

const emit = defineEmits(['recording-complete'])

const { 
  isRecording, 
  audioBlob, 
  audioUrl, 
  recordingTime, 
  startRecording, 
  stopRecording, 
  cancelRecording, 
  formatTime, 
  getAudioFile 
} = useRecorder()

const errorMessage = ref('')
const volumeLevel = ref(0)
const recordingQuality = ref('medium')

// Volume monitor
let volumeInterval = null

async function toggleRecording() {
  try {
    if (!isRecording.value) {
      await startRecording({
        mimeType: 'audio/webm;codecs=opus',
        sampleRate: recordingQuality.value === 'high' ? 48000 : 44100
      })
      startVolumeMonitor()
      console.log("🎤 Gravação iniciada")
    } else {
      stopRecording()
      stopVolumeMonitor()
      
      const audioFile = getAudioFile('recording.webm')
      if (audioFile) {
        emit('recording-complete', audioFile)
      }
      
      console.log("⏹️ Gravação parada")
    }
  } catch (error) {
    console.error('❌ Erro na gravação:', error)
    errorMessage.value = error.message
    setTimeout(() => errorMessage.value = '', 3000)
  }
}

function startVolumeMonitor() {
  volumeInterval = setInterval(() => {
    // Simulação de volume (em implementação real, usar Web Audio API)
    volumeLevel.value = Math.random() * 0.8 + 0.2
  }, 100)
}

function stopVolumeMonitor() {
  if (volumeInterval) {
    clearInterval(volumeInterval)
    volumeInterval = null
  }
  volumeLevel.value = 0
}

function cancelCurrentRecording() {
  cancelRecording()
  stopVolumeMonitor()
  errorMessage.value = 'Gravação cancelada'
  setTimeout(() => errorMessage.value = '', 2000)
}

onUnmounted(() => {
  stopVolumeMonitor()
})
</script>

<template>
  <div class="mic-view">
    <div class="mic-header">
      <h2>🎤 Gravação</h2>
      <p>Grave áudio diretamente no navegador para análise imediata</p>
    </div>
    
    <div class="mic-controls">
      <button 
        @click="toggleRecording"
        :class="{ 'recording': isRecording, 'error': errorMessage }"
        class="record-btn"
        :disabled="errorMessage && !isRecording"
      >
        <span class="record-icon" :class="{ 'pulse': isRecording }"></span>
        {{ isRecording ? "Parar Gravação" : "Iniciar Gravação" }}
      </button>
      
      <div class="recording-info" v-if="isRecording">
        <div class="timer-display">
          <span class="timer-icon">⏱️</span>
          <span class="timer-text">{{ formatTime() }}</span>
        </div>
        
        <div class="volume-indicator">
          <span class="volume-icon">🔊</span>
          <div class="volume-bar">
            <div 
              class="volume-fill" 
              :style="{ width: (volumeLevel * 100) + '%' }"
            ></div>
          </div>
          <span class="volume-text">{{ Math.round(volumeLevel * 100) }}%</span>
        </div>
      </div>
      
      <div class="recording-actions" v-if="isRecording">
        <button @click="cancelCurrentRecording" class="cancel-btn">
          🚫 Cancelar
        </button>
      </div>
    </div>
    
    <div class="mic-settings">
      <div class="setting-group">
        <label class="setting-label">
          <span class="setting-icon">⚙️</span>
          <span>Qualidade de Gravação:</span>
        </label>
        <select v-model="recordingQuality" class="quality-select" :disabled="isRecording">
          <option value="low">Baixa (22kHz)</option>
          <option value="medium">Média (44.1kHz)</option>
          <option value="high">Alta (48kHz)</option>
        </select>
      </div>
      
      <div class="setting-info">
        <div class="info-item">
          <span class="info-icon">💡</span>
          <span class="info-text">
            Use fones de ouvido para melhor qualidade
          </span>
        </div>
        <div class="info-item">
          <span class="info-icon">🎯</span>
          <span class="info-text">
            Grave em ambiente silencioso
          </span>
        </div>
      </div>
    </div>
    
    <div class="audio-preview" v-if="audioUrl && !isRecording">
      <h3>📄 Áudio Gravado</h3>
      <audio :src="audioUrl" controls class="audio-player"></audio>
      <div class="audio-info">
        <p>Duração: {{ formatTime() }}</p>
        <p>Tamanho: {{ audioBlob ? (audioBlob.size / 1024).toFixed(1) + ' KB' : '0 KB' }}</p>
      </div>
    </div>
    
    <div class="error-message" v-if="errorMessage">
      <span class="error-icon">❌</span>
      <span class="error-text">{{ errorMessage }}</span>
    </div>
  </div>
</template>

<style scoped>
.mic-view {
  max-width: 600px;
  margin: 0 auto;
}

.mic-header {
  text-align: center;
  margin-bottom: 2rem;
}

.mic-header h2 {
  font-size: 1.8rem;
  color: #333;
  margin-bottom: 0.5rem;
}

.mic-header p {
  color: #666;
  font-size: 1rem;
}

.mic-controls {
  text-align: center;
  margin-bottom: 2rem;
}

.record-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem 3rem;
  font-size: 1.2rem;
  font-weight: 600;
  border: none;
  border-radius: 50px;
  background: #f44336;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.record-btn:hover:not(:disabled) {
  background: #d32f2f;
  transform: scale(1.05);
}

.record-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
}

.record-btn.recording {
  background: #4caf50;
  animation: pulse 1.5s infinite;
}

.record-btn.recording:hover {
  background: #45a049;
}

.record-btn.error {
  background: #ff9800;
}

.record-icon {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: white;
  transition: all 0.3s ease;
}

.record-icon.pulse {
  animation: pulseIcon 1s infinite;
}

.recording-info {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-top: 1.5rem;
  flex-wrap: wrap;
}

.timer-display, .volume-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  font-family: monospace;
}

.timer-icon, .volume-icon {
  font-size: 1.2rem;
}

.timer-text {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2196f3;
}

.volume-bar {
  width: 100px;
  height: 6px;
  background: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
}

.volume-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #8bc34a);
  transition: width 0.1s ease;
}

.volume-text {
  font-size: 0.9rem;
  color: #666;
  min-width: 45px;
}

.recording-actions {
  margin-top: 1rem;
}

.cancel-btn {
  padding: 0.75rem 1.5rem;
  background: #ff9800;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.cancel-btn:hover {
  background: #f57c00;
}

.mic-settings {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 2rem;
}

.setting-group {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: #333;
}

.setting-icon {
  font-size: 1.2rem;
}

.quality-select {
  padding: 0.5rem 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: white;
  cursor: pointer;
}

.quality-select:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #666;
}

.audio-preview {
  text-align: center;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 12px;
  margin-bottom: 1rem;
}

.audio-preview h3 {
  margin-bottom: 1rem;
  color: #333;
}

.audio-player {
  width: 100%;
  max-width: 400px;
  margin-bottom: 1rem;
}

.audio-info {
  display: flex;
  justify-content: center;
  gap: 2rem;
  font-size: 0.9rem;
  color: #666;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: #ffebee;
  border: 1px solid #ffcdd2;
  border-radius: 8px;
  color: #c62828;
  margin-top: 1rem;
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

@keyframes pulseIcon {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.3);
  }
}

@media (max-width: 768px) {
  .mic-view {
    padding: 0 1rem;
  }
  
  .record-btn {
    padding: 1.25rem 2rem;
    font-size: 1.1rem;
  }
  
  .recording-info {
    flex-direction: column;
    gap: 1rem;
  }
  
  .timer-display, .volume-indicator {
    width: 100%;
    justify-content: center;
  }
  
  .volume-bar {
    width: 150px;
  }
  
  .setting-group {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
  
  .audio-info {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
