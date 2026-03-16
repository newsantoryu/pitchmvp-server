<script setup>
import { ref } from "vue"

const emit = defineEmits(['toggle-recording'])

const isRecording = ref(false)
const recordingTime = ref(0)
const timer = ref(null)

async function toggleRecording() {
  try {
    if (!isRecording.value) {
      // Simulação de gravação (sem microfone real)
      isRecording.value = true
      startTimer()
      console.log("🎤 Gravação simulada iniciada")
    } else {
      // Parar gravação
      isRecording.value = false
      stopTimer()
      console.log("⏹️ Gravação simulada parada")
    }
    
    // Emitir evento para o componente pai
    emit('toggle-recording')
    
  } catch (error) {
    console.error('❌ Erro na gravação:', error)
  }
}

function startTimer() {
  recordingTime.value = 0
  timer.value = setInterval(() => {
    recordingTime.value++
  }, 1000)
}

function stopTimer() {
  if (timer.value) {
    clearInterval(timer.value)
    timer.value = null
  }
  recordingTime.value = 0
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
</script>

<template>
  <div class="recorder">
    <button 
      @click="toggleRecording"
      :class="{ 'recording': isRecording }"
      class="record-btn"
    >
      <span class="record-icon"></span>
      {{ isRecording ? "Parar" : "Gravar" }}
    </button>
    
    <div class="recording-status">
      <span v-if="isRecording" class="status-text">
        🔴 Gravando... {{ formatTime(recordingTime) }}
      </span>
      <span v-else class="status-text">
        🎤 Pronto para gravar
      </span>
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
}

.record-btn:hover {
  background: #d32f2f;
  transform: scale(1.05);
}

.record-btn.recording {
  background: #4caf50;
  animation: pulse 1.5s infinite;
}

.record-btn.recording:hover {
  background: #45a049;
}

.record-icon {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: white;
}

.recording-status {
  text-align: center;
}

.status-text {
  font-size: 0.9rem;
  color: #666;
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
</style>
