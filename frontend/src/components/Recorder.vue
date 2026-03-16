<script setup>
import { ref } from "vue"
import { useRecorder } from "../composables/useRecorder.js"
import { useMicrophone } from "../composables/useMicrophone.js"

const emit = defineEmits(['toggle-recording', 'recording-complete'])

// Hooks migrados do backend
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

const { 
  isMicrophoneActive, 
  start: startMicrophone, 
  stop: stopMicrophone, 
  getVolumeLevel 
} = useMicrophone()

const volumeLevel = ref(0)
const errorMessage = ref('')

// Volume monitor
let volumeInterval = null

async function toggleRecording() {
  try {
    if (!isRecording.value) {
      // Iniciar gravação
      await startRecording({
        mimeType: 'audio/webm;codecs=opus',
        sampleRate: 44100
      })
      
      // Iniciar monitor de volume
      startVolumeMonitor()
      
      console.log("🎤 Gravação iniciada com MediaRecorder")
    } else {
      // Parar gravação
      stopRecording()
      stopVolumeMonitor()
      
      // Emitir evento com o arquivo gravado
      const audioFile = getAudioFile('recording.webm')
      if (audioFile) {
        emit('recording-complete', audioFile)
      }
      
      console.log("⏹️ Gravação parada")
    }
    
    // Emitir evento para o componente pai
    emit('toggle-recording')
    
  } catch (error) {
    console.error('❌ Erro na gravação:', error)
    errorMessage.value = error.message
    
    // Limpa erro após 3 segundos
    setTimeout(() => {
      errorMessage.value = ''
    }, 3000)
  }
}

function startVolumeMonitor() {
  volumeInterval = setInterval(() => {
    volumeLevel.value = getVolumeLevel()
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
  setTimeout(() => {
    errorMessage.value = ''
  }, 2000)
}

// Limpa recursos ao desmontar
onUnmounted(() => {
  stopVolumeMonitor()
})
</script>

<template>
  <div class="recorder">
    <!-- Botão de gravação -->
    <button 
      @click="toggleRecording"
      :class="{ 'recording': isRecording, 'error': errorMessage }"
      class="record-btn"
      :disabled="errorMessage && !isRecording"
    >
      <span class="record-icon" :class="{ 'pulse': isRecording }"></span>
      {{ isRecording ? "Parar" : "Gravar" }}
    </button>
    
    <!-- Indicador de volume -->
    <div class="volume-indicator" v-if="isRecording">
      <div class="volume-bar">
        <div 
          class="volume-fill" 
          :style="{ width: (volumeLevel * 100) + '%' }"
        ></div>
      </div>
      <span class="volume-text">Volume: {{ Math.round(volumeLevel * 100) }}%</span>
    </div>
    
    <!-- Timer -->
    <div class="recording-timer" v-if="isRecording">
      <span class="timer-text">⏱️ {{ formatTime() }}</span>
    </div>
    
    <!-- Status da gravação -->
    <div class="recording-status">
      <span v-if="isRecording" class="status-text recording">
        🔴 Gravando... {{ formatTime() }}
      </span>
      <span v-else-if="errorMessage" class="status-text error">
        ❌ {{ errorMessage }}
      </span>
      <span v-else class="status-text">
        🎤 Pronto para gravar
      </span>
    </div>
    
    <!-- Ações adicionais -->
    <div class="recording-actions" v-if="isRecording">
      <button @click="cancelCurrentRecording" class="cancel-btn">
        🚫 Cancelar
      </button>
    </div>
    
    <!-- Preview do áudio gravado -->
    <div class="audio-preview" v-if="audioUrl && !isRecording">
      <audio :src="audioUrl" controls class="audio-player"></audio>
      <p class="preview-info">Áudio gravado: {{ audioBlob ? (audioBlob.size / 1024).toFixed(1) + ' KB' : '0 KB' }}</p>
    </div>
  </div>
</template>

<style scoped>
.recorder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  background: #f8f9fa;
  border-radius: 12px;
  border: 1px solid #e0e0e0;
}

.record-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 2rem;
  font-size: 1.1rem;
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

.record-btn:hover {
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
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: white;
  transition: all 0.3s ease;
}

.record-icon.pulse {
  animation: pulseIcon 1s infinite;
}

.volume-indicator {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  max-width: 300px;
}

.volume-bar {
  flex: 1;
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
  font-size: 0.8rem;
  color: #666;
  min-width: 80px;
}

.recording-timer {
  text-align: center;
}

.timer-text {
  font-size: 1.2rem;
  font-weight: 600;
  color: #2196f3;
  font-family: monospace;
}

.recording-status {
  text-align: center;
}

.status-text {
  font-size: 0.9rem;
  color: #666;
  font-weight: 500;
}

.status-text.recording {
  color: #4caf50;
  animation: blink 1s infinite;
}

.status-text.error {
  color: #f44336;
}

.recording-actions {
  display: flex;
  gap: 1rem;
}

.cancel-btn {
  padding: 0.5rem 1rem;
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

.audio-preview {
  text-align: center;
  width: 100%;
  max-width: 400px;
}

.audio-player {
  width: 100%;
  margin-bottom: 0.5rem;
}

.preview-info {
  font-size: 0.8rem;
  color: #666;
  margin: 0;
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
    transform: scale(1.2);
  }
}

@keyframes blink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0.5;
  }
}

@media (max-width: 768px) {
  .recorder {
    padding: 1rem;
  }
  
  .record-btn {
    padding: 0.8rem 1.5rem;
    font-size: 1rem;
  }
  
  .volume-indicator {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .volume-text {
    min-width: auto;
  }
}
</style>
