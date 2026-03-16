<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTranscriptionStore } from '../stores/transcriptionStore.js'

const router = useRouter()
const transcriptionStore = useTranscriptionStore()

const urlInput = ref('')
const isValidUrl = ref(false)
const voiceGender = ref('auto')
const anonKey = ref('')

function validateUrl() {
  const url = urlInput.value.trim()
  const supabasePattern = /https:\/\/.*\.supabase\.co\/storage\/v1\/object\/.*/
  isValidUrl.value = supabasePattern.test(url)
}

async function submitUrl() {
  if (!isValidUrl.value || !urlInput.value.trim()) return
  
  try {
    await transcriptionStore.transcribeAudioUrl(urlInput.value.trim(), {
      anonKey: anonKey.value,
      voiceGender: voiceGender.value
    })
    
    // Navegar para resultados
    router.push('/results')
    
  } catch (error) {
    console.error('❌ Erro na transcrição:', error)
  }
}

function handleInput() {
  validateUrl()
}

function goHome() {
  router.push('/')
}
</script>

<template>
  <div class="transcription-page">
    <!-- Header -->
    <header class="page-header">
      <button @click="goHome" class="back-btn">← Home</button>
      <h1>🎼 Transcrição</h1>
    </header>

    <!-- Main Content -->
    <main class="transcription-content">
      <!-- URL Input -->
      <div class="url-section">
        <div class="url-card">
          <h2>🔗 URL do Supabase</h2>
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
            
            <!-- Anon Key -->
            <div class="input-group">
              <input 
                type="text" 
                placeholder="Chave Anon (opcional)"
                class="url-input"
                v-model="anonKey"
              >
            </div>
          </div>
          
          <!-- Settings -->
          <div class="settings-group">
            <label>
              <span>Gênero Vocal:</span>
              <select v-model="voiceGender">
                <option value="auto">Auto</option>
                <option value="male">Masculino</option>
                <option value="female">Feminino</option>
              </select>
            </label>
          </div>
          
          <!-- Actions -->
          <div class="url-actions">
            <button 
              @click="submitUrl"
              :disabled="!isValidUrl || !urlInput.trim() || transcriptionStore.isProcessing"
              class="submit-btn"
            >
              {{ transcriptionStore.isProcessing ? 'Processando...' : 'Transcrever' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Progress -->
      <div v-if="transcriptionStore.isProcessing" class="progress-section">
        <div class="progress-card">
          <h3>🔄 Processando...</h3>
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: transcriptionStore.progress + '%' }"
            ></div>
          </div>
          <p>{{ transcriptionStore.progress }}%</p>
          <p>Status: {{ transcriptionStore.jobStatus }}</p>
          
          <button 
            @click="transcriptionStore.cancelCurrentJob"
            class="cancel-btn"
          >
            Cancelar
          </button>
        </div>
      </div>

      <!-- Recent Transcriptions -->
      <div class="recent-section" v-if="transcriptionStore.transcriptions.length > 0">
        <div class="recent-card">
          <h3>📚 Transcrições Recentes</h3>
          <div class="transcription-list">
            <div 
              v-for="transcription in transcriptionStore.transcriptions.slice(0, 5)"
              :key="transcription.id"
              class="transcription-item"
              @click="router.push(`/results/${transcription.id}`)"
            >
              <div class="transcription-info">
                <h4>{{ transcription.title || 'Transcrição ' + transcription.id.slice(0, 8) }}</h4>
                <p>{{ new Date(transcription.createdAt).toLocaleDateString() }}</p>
              </div>
              <div class="transcription-actions">
                <button class="view-btn">Ver</button>
              </div>
            </div>
          </div>
          
          <button 
            @click="router.push('/scores')"
            class="view-all-btn"
          >
            Ver Todas
          </button>
        </div>
      </div>

      <!-- Examples -->
      <div class="examples-section">
        <div class="examples-card">
          <h3>💡 Exemplos de URLs</h3>
          <div class="example-list">
            <div class="example-item">
              <code>https://abc123.supabase.co/storage/v1/object/public/audio/music.mp3</code>
            </div>
            <div class="example-item">
              <code>https://xyz789.supabase.co/storage/v1/object/protected/songs/track.wav</code>
            </div>
          </div>
        </div>
      </div>

      <!-- Info -->
      <div class="info-section">
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
    </main>
  </div>
</template>

<style scoped>
.transcription-page {
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

.transcription-content {
  max-width: 700px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.url-section,
.progress-section,
.recent-section,
.examples-section {
  display: flex;
  justify-content: center;
}

.url-card,
.progress-card,
.recent-card,
.examples-card {
  background: rgba(255, 255, 255, 0.95);
  padding: 2rem;
  border-radius: 16px;
  backdrop-filter: blur(10px);
  width: 100%;
}

.url-card h2,
.progress-card h3,
.recent-card h3,
.examples-card h3 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: #333;
}

.url-form {
  margin-bottom: 1.5rem;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
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

.settings-group {
  margin-bottom: 1.5rem;
}

.settings-group label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #333;
}

.settings-group select {
  padding: 0.5rem 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: white;
}

.url-actions {
  display: flex;
  justify-content: center;
}

.submit-btn {
  padding: 1rem 2rem;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.submit-btn:hover:not(:disabled) {
  background: #1976d2;
  transform: translateY(-2px);
}

.submit-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin: 1rem 0;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #2196f3, #4caf50);
  transition: width 0.3s ease;
}

.cancel-btn {
  padding: 0.5rem 1rem;
  background: #f44336;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 1rem;
}

.transcription-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.transcription-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.transcription-item:hover {
  background: #e3f2fd;
  transform: translateX(5px);
}

.transcription-info h4 {
  margin: 0 0 0.25rem 0;
  color: #333;
}

.transcription-info p {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
}

.view-btn {
  padding: 0.5rem 1rem;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.view-all-btn {
  width: 100%;
  padding: 0.75rem;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.view-all-btn:hover {
  background: #e0e0e0;
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

@media (max-width: 768px) {
  .transcription-page {
    padding: 1rem;
  }
  
  .page-header h1 {
    font-size: 1.5rem;
  }
  
  .input-group {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
  
  .input-status {
    align-self: center;
    margin-top: 0.5rem;
  }
  
  .transcription-item {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
  
  .transcription-actions {
    align-self: flex-end;
  }
}
</style>
