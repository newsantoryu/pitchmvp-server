<script setup>
import { ref } from 'vue'

const emit = defineEmits(['upload-complete'])

const isDragging = ref(false)
const selectedFile = ref(null)

function handleFileSelect(event) {
  const file = event.target.files[0]
  if (file && file.type.startsWith('audio/')) {
    selectedFile.value = file
    emit('upload-complete', file)
  }
}

function handleDragOver(event) {
  event.preventDefault()
  isDragging.value = true
}

function handleDragLeave() {
  isDragging.value = false
}

function handleDrop(event) {
  event.preventDefault()
  isDragging.value = false
  
  const file = event.dataTransfer.files[0]
  if (file && file.type.startsWith('audio/')) {
    selectedFile.value = file
    emit('upload-complete', file)
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>

<template>
  <div class="upload-view">
    <div class="upload-header">
      <h2>📁 Upload de Arquivo</h2>
      <p>Envie um arquivo de áudio para análise de pitch</p>
    </div>
    
    <div 
      class="upload-area"
      :class="{ 'dragging': isDragging }"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
    >
      <input 
        type="file" 
        accept="audio/*" 
        @change="handleFileSelect"
        class="file-input"
        id="file-upload"
      >
      <label for="file-upload" class="upload-label">
        <div class="upload-icon">📁</div>
        <div class="upload-text">
          <p v-if="!selectedFile">
            Clique para selecionar ou arraste o arquivo
          </p>
          <p v-else class="selected-file">
            📄 {{ selectedFile.name }}
            <small>{{ formatFileSize(selectedFile.size) }}</small>
          </p>
          <small v-if="!selectedFile">
            MP3, WAV, M4A, OGG (max 50MB)
          </small>
        </div>
      </label>
    </div>
    
    <div class="upload-info">
      <div class="info-item">
        <span class="info-icon">ℹ️</span>
        <span class="info-text">
          Formatos suportados: MP3, WAV, M4A, OGG, FLAC
        </span>
      </div>
      <div class="info-item">
        <span class="info-icon">🔒</span>
        <span class="info-text">
          Seus arquivos são processados localmente
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.upload-view {
  max-width: 600px;
  margin: 0 auto;
}

.upload-header {
  text-align: center;
  margin-bottom: 2rem;
}

.upload-header h2 {
  font-size: 1.8rem;
  color: #333;
  margin-bottom: 0.5rem;
}

.upload-header p {
  color: #666;
  font-size: 1rem;
}

.upload-area {
  border: 2px dashed #ccc;
  border-radius: 12px;
  padding: 3rem 2rem;
  text-align: center;
  transition: all 0.3s ease;
  cursor: pointer;
  background: #fafafa;
}

.upload-area:hover,
.upload-area.dragging {
  border-color: #2196f3;
  background: #f8f9fa;
}

.upload-area.dragging {
  border-color: #4caf50;
  background: #e8f5e8;
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
  transition: transform 0.3s ease;
}

.upload-area:hover .upload-icon {
  transform: scale(1.1);
}

.upload-text p {
  font-size: 1.1rem;
  color: #333;
  margin-bottom: 0.5rem;
  transition: color 0.3s ease;
}

.upload-area:hover .upload-text p {
  color: #2196f3;
}

.selected-file {
  color: #4caf50 !important;
  font-weight: 600;
}

.upload-text small {
  color: #666;
  font-size: 0.9rem;
}

.upload-info {
  margin-top: 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 8px;
  font-size: 0.9rem;
  color: #666;
}

.info-icon {
  font-size: 1rem;
}

@media (max-width: 768px) {
  .upload-area {
    padding: 2rem 1rem;
  }
  
  .upload-icon {
    font-size: 2.5rem;
  }
  
  .upload-text p {
    font-size: 1rem;
  }
}
</style>
