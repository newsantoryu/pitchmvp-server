<script setup>
import { ref } from 'vue'

const emit = defineEmits(['url-submit'])

const urlInput = ref('')
const isValidUrl = ref(false)

function validateUrl() {
  const url = urlInput.value.trim()
  const supabasePattern = /https:\/\/.*\.supabase\.co\/storage\/v1\/object\/.*/
  isValidUrl.value = supabasePattern.test(url)
}

function handleSubmit() {
  if (isValidUrl.value && urlInput.value.trim()) {
    emit('url-submit', urlInput.value.trim())
  }
}

function handleInput() {
  validateUrl()
}
</script>

<template>
  <div class="url-view">
    <div class="url-header">
      <h2>🔗 URL Supabase</h2>
      <p>Use uma URL do Supabase para analisar áudio remoto</p>
    </div>
    
    <div class="url-form">
      <div class="input-group">
        <input 
          type="url" 
          placeholder="https://*.supabase.co/storage/v1/object/*"
          class="url-input"
          v-model="urlInput"
          @input="handleInput"
          :class="{ 'valid': isValidUrl, 'invalid': urlInput && !isValidUrl }"
        >
        <div class="input-status">
          <span v-if="urlInput && isValidUrl" class="status-icon valid">✅</span>
          <span v-else-if="urlInput && !isValidUrl" class="status-icon invalid">❌</span>
          <span v-else class="status-icon neutral">🔗</span>
        </div>
      </div>
      
      <button 
        @click="handleSubmit"
        :disabled="!isValidUrl || !urlInput.trim()"
        class="submit-btn"
      >
        Analisar URL
      </button>
    </div>
    
    <div class="url-examples">
      <h3>Exemplos de URLs válidas:</h3>
      <div class="example-list">
        <div class="example-item">
          <code>https://abc123.supabase.co/storage/v1/object/public/audio/music.mp3</code>
        </div>
        <div class="example-item">
          <code>https://xyz789.supabase.co/storage/v1/object/protected/songs/track.wav</code>
        </div>
      </div>
    </div>
    
    <div class="url-info">
      <div class="info-item">
        <span class="info-icon">📋</span>
        <span class="info-text">
          A URL deve apontar para um arquivo de áudio válido
        </span>
      </div>
      <div class="info-item">
        <span class="info-icon">🌐</span>
        <span class="info-text">
          O arquivo deve ser publicamente acessível
        </span>
      </div>
      <div class="info-item">
        <span class="info-icon">⚡</span>
        <span class="info-text">
          O processamento é feito em tempo real
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.url-view {
  max-width: 700px;
  margin: 0 auto;
}

.url-header {
  text-align: center;
  margin-bottom: 2rem;
}

.url-header h2 {
  font-size: 1.8rem;
  color: #333;
  margin-bottom: 0.5rem;
}

.url-header p {
  color: #666;
  font-size: 1rem;
}

.url-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.url-input {
  flex: 1;
  padding: 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.url-input:focus {
  outline: none;
  border-color: #2196f3;
}

.url-input.valid {
  border-color: #4caf50;
  background: #f1f8e9;
}

.url-input.invalid {
  border-color: #f44336;
  background: #ffebee;
}

.input-status {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
}

.status-icon {
  font-size: 1.2rem;
}

.submit-btn {
  padding: 1rem 2rem;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.3s ease;
}

.submit-btn:hover:not(:disabled) {
  background: #1976d2;
  transform: translateY(-1px);
}

.submit-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
}

.url-examples {
  margin-bottom: 2rem;
}

.url-examples h3 {
  font-size: 1.2rem;
  color: #333;
  margin-bottom: 1rem;
}

.example-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.example-item {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  border-left: 4px solid #2196f3;
}

.example-item code {
  color: #333;
  font-family: monospace;
  font-size: 0.9rem;
  word-break: break-all;
}

.url-info {
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
  .url-view {
    padding: 0 1rem;
  }
  
  .input-group {
    flex-direction: column;
    align-items: stretch;
  }
  
  .input-status {
    align-self: center;
    margin-top: 0.5rem;
  }
  
  .example-item code {
    font-size: 0.8rem;
  }
}
</style>
