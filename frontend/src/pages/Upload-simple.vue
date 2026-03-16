<script setup>
import { ref } from 'vue'

const selectedFile = ref(null)
const isDragging = ref(false)

function handleFileSelect(event) {
  const file = event.target.files[0]
  if (file && file.type.startsWith('audio/')) {
    selectedFile.value = file
    console.log('📁 Arquivo selecionado:', file.name)
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
    console.log('📁 Arquivo arrastado:', file.name)
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
  <div class="upload-page">
    <!-- Header -->
    <header class="page-header">
      <a href="/" class="back-btn">← Home</a>
      <h1>📁 Upload de Áudio</h1>
    </header>

    <!-- Main Content -->
    <main class="upload-content">
      <!-- Upload Area -->
      <div 
        class="upload-area"
        :class="{ 'dragging': isDragging, 'has-file': selectedFile }"
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
          <div class="upload-icon">
            {{ selectedFile ? '📄' : '📁' }}
          </div>
          <div class="upload-text">
            <p v-if="!selectedFile">
              Arraste um arquivo ou clique para selecionar
            </p>
            <p v-else class="selected-file">
              {{ selectedFile.name }}
            </p>
            <small v-if="!selectedFile">
              MP3, WAV, M4A, OGG (max 50MB)
            </small>
            <small v-else>
              {{ formatFileSize(selectedFile.size) }}
            </small>
          </div>
        </label>
      </div>

      <!-- Actions -->
      <div class="upload-actions" v-if="selectedFile">
        <button class="upload-btn">
          Analisar Áudio
        </button>
        
        <button 
          @click="selectedFile = null"
          class="cancel-btn"
        >
          Limpar
        </button>
      </div>

      <!-- Info -->
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
            Seus arquivos são processados com segurança
          </span>
        </div>
        <div class="info-item">
          <span class="info-icon">⚡</span>
          <span class="info-text">
            Processamento rápido com IA avançada
          </span>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.upload-page {
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
  text-decoration: none;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.page-header h1 {
  font-size: 2rem;
  margin: 0;
}

.upload-content {
  max-width: 600px;
  margin: 0 auto;
}

.upload-area {
  border: 3px dashed rgba(255, 255, 255, 0.5);
  border-radius: 16px;
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  margin-bottom: 2rem;
}

.upload-area:hover,
.upload-area.dragging {
  border-color: #4caf50;
  background: rgba(76, 175, 80, 0.1);
}

.upload-area.has-file {
  border-color: #2196f3;
  background: rgba(33, 150, 243, 0.1);
}

.file-input {
  display: none;
}

.upload-label {
  cursor: pointer;
  display: block;
}

.upload-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  transition: transform 0.3s ease;
}

.upload-area:hover .upload-icon {
  transform: scale(1.1);
}

.upload-text p {
  font-size: 1.2rem;
  color: white;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.selected-file {
  color: #4caf50 !important;
}

.upload-text small {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
}

.upload-actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

.upload-btn {
  flex: 1;
  padding: 1rem 2rem;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.upload-btn:hover:not(:disabled) {
  background: #45a049;
  transform: translateY(-2px);
}

.cancel-btn {
  padding: 1rem 2rem;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.cancel-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
}

.upload-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: white;
  font-size: 0.9rem;
}

.info-icon {
  font-size: 1.2rem;
}

@media (max-width: 768px) {
  .upload-page {
    padding: 1rem;
  }
  
  .page-header h1 {
    font-size: 1.5rem;
  }
  
  .upload-area {
    padding: 2rem 1rem;
  }
  
  .upload-icon {
    font-size: 3rem;
  }
  
  .upload-text p {
    font-size: 1rem;
  }
  
  .upload-actions {
    flex-direction: column;
  }
}
</style>
