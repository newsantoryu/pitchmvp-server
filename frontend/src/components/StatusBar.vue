<script setup>
import { ref } from 'vue'

const status = ref('Pronto')
const message = ref('Sistema inicializado')
const progress = ref(0)
const isProcessing = ref(false)

function setStatus(newStatus, newMessage = '', newProgress = 0) {
  status.value = newStatus
  message.value = newMessage
  progress.value = newProgress
}

function setProcessing(processing, msg = '') {
  isProcessing.value = processing
  if (processing) {
    status.value = 'Processando'
    message.value = msg || 'Analisando áudio...'
  } else {
    status.value = 'Pronto'
    message.value = msg || 'Análise concluída'
  }
}

function showError(errorMsg) {
  status.value = 'Erro'
  message.value = errorMsg
  progress.value = 0
}

// Expor funções para uso externo
defineExpose({
  setStatus,
  setProcessing,
  showError
})
</script>

<template>
  <div class="status-bar">
    <div class="status-info">
      <div class="status-indicator" :class="{ 'processing': isProcessing }">
        <div class="status-dot"></div>
        <span class="status-text">{{ status }}</span>
      </div>
      <div class="status-message">{{ message }}</div>
    </div>
    
    <div class="progress-bar" v-if="isProcessing">
      <div class="progress-fill" :style="{ width: progress + '%' }"></div>
    </div>
  </div>
</template>

<style scoped>
.status-bar {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
}

.status-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4caf50;
  transition: background 0.3s ease;
}

.status-indicator.processing .status-dot {
  background: #ff9800;
  animation: blink 1s infinite;
}

.status-text {
  font-weight: 600;
  font-size: 0.9rem;
}

.status-message {
  font-size: 0.9rem;
  color: #666;
}

.progress-bar {
  height: 4px;
  background: #f0f0f0;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #2196f3;
  transition: width 0.3s ease;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0.3; }
}
</style>
