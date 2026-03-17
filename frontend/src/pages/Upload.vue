<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTranscriptionStore } from '../stores/transcriptionStore.js'

const router = useRouter()
const transcriptionStore = useTranscriptionStore()

const selectedFile = ref(null)
const isDragging = ref(false)
const voiceGender = ref('auto')
const transcriptionLanguage = ref('en') // Padrão alterado para inglês

// Timer específico para transcribe-file
const processingTime = ref(0)
const isTranscribeFileProcessing = ref(false)
let transcribeTimer = null

const startTranscribeTimer = () => {
  processingTime.value = 0
  isTranscribeFileProcessing.value = true
  
  transcribeTimer = setInterval(() => {
    processingTime.value++
    
    // Timer infinito - apenas conta tempo para feedback visual
    // Sem avisos ou interrupções
  }, 1000)
}

const stopTranscribeTimer = () => {
  if (transcribeTimer) {
    clearInterval(transcribeTimer)
    transcribeTimer = null
  }
  isTranscribeFileProcessing.value = false
  processingTime.value = 0
}

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

async function uploadFile() {
  if (!selectedFile.value) {
    alert('Por favor, selecione um arquivo de áudio primeiro.')
    return
  }

  try {
    console.log('🎵 Iniciando transcrição do arquivo:', selectedFile.value.name)
    console.log('🌐 Idioma da transcrição:', transcriptionLanguage.value)
    console.log('👤 Gênero vocal:', voiceGender.value)
    
    // Iniciar timer específico para transcribe-file (40 minutos)
    startTranscribeTimer()
    
    await transcriptionStore.transcribeAudioFile(selectedFile.value, {
      voiceGender: voiceGender.value,
      language: transcriptionLanguage.value // Incluir idioma
    })
    
    // Parar timer em caso de sucesso
    stopTranscribeTimer()
    
    // Redirecionar para resultados com o score_id
    if (transcriptionStore.latestTranscription && transcriptionStore.latestTranscription.scoreId) {
      const scoreId = transcriptionStore.latestTranscription.scoreId
      console.log(`🎯 Redirecionando para detalhes da cifra: /results/${scoreId}`)
      router.push(`/results/${scoreId}`)
    } else {
      // Fallback: redirecionar para resultados genérico
      console.log('📋 Redirecionando para lista de resultados')
      router.push('/results')
    }
    
  } catch (err) {
    // Parar timer em caso de erro
    stopTranscribeTimer()
    
    console.error('❌ Erro na transcrição:', err)
    
    // Apenas mostrar erros reais de processamento
    // Nunca mostrar erros de timeout para o usuário
    if (!err.message.includes('timeout') && !err.message.includes('Timeout') && !err.message.includes('conexão')) {
      alert('Erro na transcrição: ' + err.message)
    } else {
      // Erros de timeout/conexão são silenciosos - usuário pode continuar esperando
      console.warn('⏰ Operação demorando mais que o normal, mas continuando...')
    }
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function goHome() {
  router.push('/')
}

function getProgressMessage() {
  const status = transcriptionStore.jobStatus
  const messages = {
    'queued': transcriptionLanguage.value === 'pt' ? 'Arquivo na fila...' : 'File queued...',
    'transcribing': transcriptionLanguage.value === 'pt' ? 'Transcrevendo áudio...' : 'Transcribing audio...',
    'pitch': transcriptionLanguage.value === 'pt' ? 'Analisando precisão musical (CREPE)...' : 'Analyzing musical precision (CREPE)...',
    'done': transcriptionLanguage.value === 'pt' ? 'Transcrição concluída!' : 'Transcription completed!',
    'error': transcriptionLanguage.value === 'pt' ? 'Erro na transcrição' : 'Transcription error'
  }
  return messages[status] || (transcriptionLanguage.value === 'pt' ? 'Processando...' : 'Processing...')
}

function getProgressDetail() {
  const status = transcriptionStore.jobStatus
  const progress = transcriptionStore.progress
  const details = {
    'queued': transcriptionLanguage.value === 'pt' 
      ? 'Aguardando início do processamento' 
      : 'Waiting for processing to start',
    'transcribing': transcriptionLanguage.value === 'pt' 
      ? `Convertendo fala em texto (${transcriptionLanguage.value === 'pt' ? 'Português' : 'English'}) - ${progress}%` 
      : `Converting speech to text (${transcriptionLanguage.value === 'pt' ? 'Portuguese' : 'English'}) - ${progress}%`,
    'pitch': transcriptionLanguage.value === 'pt' 
      ? `Análise de precisão musical com algoritmo CREPE - ${progress}%` 
      : `Musical precision analysis with CREPE algorithm - ${progress}%`,
    'done': transcriptionLanguage.value === 'pt' 
      ? 'Processamento de alta precisão concluído com sucesso!' 
      : 'High precision processing completed successfully!',
    'error': transcriptionLanguage.value === 'pt' 
      ? 'Ocorreu um erro durante o processamento' 
      : 'An error occurred during processing'
  }
  
  // Mensagens especiais para processamentos longos
  if (status === 'transcribing' && progress >= 20 && progress <= 60) {
    return transcriptionLanguage.value === 'pt' 
      ? 'Processando áudio com IA... Isso pode levar alguns minutos.'
      : 'Processing audio with AI... This may take a few minutes.'
  }
  
  if (status === 'pitch') {
    return transcriptionLanguage.value === 'pt' 
      ? 'Análise musical de alta precisão em andamento. O algoritmo CREPE foca em precisão máxima, não velocidade. Tempo estimado: 15-25 minutos.'
      : 'High-precision musical analysis in progress. The CREPE algorithm focuses on maximum precision, not speed. Estimated time: 15-25 minutes.'
  }
  
  return details[status] || (transcriptionLanguage.value === 'pt' 
    ? `Processando sua transcrição com alta precisão... ${progress}%` 
    : `Processing your transcription with high precision... ${progress}%`)
}
</script>

<template>
  <div class="upload-page">
    <!-- Header -->
    <header class="page-header">
      <button @click="goHome" class="back-btn">← Home</button>
      <div>
        <h1>🎵 Transcrição de Áudio</h1>
        <p class="header-subtitle">Converta áudio em texto com IA avançada</p>
      </div>
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
            {{ selectedFile ? '🎵' : '📁' }}
          </div>
          <div class="upload-text">
            <p v-if="!selectedFile">
              Arraste um arquivo de áudio para transcrever
            </p>
            <p v-else class="selected-file">
              {{ selectedFile.name }}
            </p>
            <small v-if="!selectedFile">
              MP3, WAV, M4A, OGG (max 50MB) • Transcrição automática
            </small>
            <small v-else>
              {{ formatFileSize(selectedFile.size) }} • Pronto para transcrever
            </small>
          </div>
        </label>
      </div>

      <!-- Settings -->
      <div class="upload-settings" v-if="selectedFile">
        <h3> Configurações de Transcrição</h3>
        
        <div class="setting-group">
          <label>
            <span> Idioma do Áudio:</span>
            <select v-model="transcriptionLanguage">
              <option value="en">English (US)</option>
              <option value="pt">Português (Brasil)</option>
            </select>
          </label>
        </div>
        
        <div class="setting-group">
          <label>
            <span>👤 Gênero Vocal:</span>
            <select v-model="voiceGender">
              <option value="auto">Auto</option>
              <option value="male">Masculino</option>
              <option value="female">Feminino</option>
            </select>
          </label>
        </div>
      </div>

      <!-- Actions -->
      <div class="upload-actions" v-if="selectedFile">
        <button 
          @click="uploadFile"
          :disabled="transcriptionStore.isProcessing"
          class="upload-btn"
        >
          {{ transcriptionStore.isProcessing ? 'Transcrevendo...' : 'Transcrever Áudio' }}
        </button>
        
        <button 
          @click="selectedFile = null"
          :disabled="transcriptionStore.isProcessing"
          class="cancel-btn"
        >
          Cancelar
        </button>
      </div>

      <!-- Timeout Messages for transcribe-file -->
      <div v-if="isTranscribeFileProcessing" class="timeout-messages">
        <div v-if="processingTime > 1800 && processingTime < 2400" class="timeout-warning">
          ⚠️ Processamento demorando mais que o normal (30 minutos)
        </div>
        
        <div v-if="processingTime >= 2400" class="timeout-error">
          ⏰ Tempo máximo excedido (40 minutos para transcribe-file)
          <button @click="stopTranscribeTimer" class="stop-btn">Parar Processamento</button>
        </div>
      </div>

      <!-- Progress -->
      <div v-if="transcriptionStore.isProcessing" class="progress-section">
        <h3>🎵 {{ getProgressMessage() }}</h3>
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: transcriptionStore.progress + '%' }"
          ></div>
        </div>
        <p>{{ transcriptionStore.progress }}%</p>
        <p>Status: {{ transcriptionStore.jobStatus }}</p>
        <p class="progress-detail">
          {{ getProgressDetail() }}
        </p>
        
        <!-- Aviso sobre processamento longo -->
        <div v-if="transcriptionStore.jobStatus === 'pitch'" class="long-processing-warning">
          <div class="warning-icon">⏱️</div>
          <div class="warning-text">
            <strong>{{ transcriptionLanguage === 'pt' ? 'Processamento Longo' : 'Long Processing' }}</strong>
            <p>{{ transcriptionLanguage === 'pt' 
              ? 'Análise musical de alta precisão pode levar 15-25 minutos. O algoritmo CREPE prioriza precisão máxima sobre velocidade.'
              : 'High-precision musical analysis may take 15-25 minutes. The CREPE algorithm prioritizes maximum precision over speed.' }}</p>
          </div>
        </div>
      </div>

      <!-- Info -->
      <div class="upload-info">
        <div class="info-item">
          <span class="info-icon">🎵</span>
          <span class="info-text">
            Transcrição automática de áudio para texto com IA
          </span>
        </div>
        <div class="info-item">
          <span class="info-icon">🌐</span>
          <span class="info-text">
            Suporte para Português (Brasil) e Inglês (US)
          </span>
        </div>
        <div class="info-item">
          <span class="info-icon">⚡</span>
          <span class="info-text">
            Processamento rápido com reconhecimento avançado de fala
          </span>
        </div>
        <div class="info-item">
          <span class="info-icon">🔒</span>
          <span class="info-text">
            Seus arquivos são processados com segurança e privacidade
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
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.page-header h1 {
  font-size: 2rem;
  margin: 0;
}

.header-subtitle {
  color: rgba(255, 255, 255, 0.9);
  margin: 0.5rem 0 0 0;
  font-size: 1.1rem;
  font-weight: 400;
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

.upload-settings {
  background: rgba(255, 255, 255, 0.95);
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 2rem;
}

.upload-settings h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #333;
}

.setting-group {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.setting-group label {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: #333;
}

.setting-group select {
  padding: 0.5rem 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: white;
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

.upload-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
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

.progress-section {
  background: rgba(255, 255, 255, 0.95);
  padding: 2rem;
  border-radius: 12px;
  text-align: center;
  margin-bottom: 2rem;
}

.progress-section h3 {
  margin-top: 0;
  color: #333;
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

.progress-detail {
  color: #666;
  font-size: 0.9rem;
  font-style: italic;
  margin-top: 0.5rem;
}

.long-processing-warning {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-top: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, #fff3cd, #f8f9fa);
  border: 1px solid #ffc107;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(255, 193, 7, 0.1);
}

.warning-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
  margin-top: 0.25rem;
}

.warning-text {
  flex: 1;
}

.warning-text strong {
  color: #856404;
  font-size: 0.95rem;
  display: block;
  margin-bottom: 0.25rem;
}

.warning-text p {
  color: #856404;
  font-size: 0.85rem;
  line-height: 1.4;
  margin: 0;
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
  
  .setting-group {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
}

/* Timeout Messages for transcribe-file */
.timeout-messages {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.timeout-warning {
  padding: 1rem;
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 8px;
  color: #ffc107;
  text-align: center;
  font-weight: 500;
}

.timeout-error {
  padding: 1rem;
  background: rgba(220, 53, 69, 0.1);
  border: 1px solid rgba(220, 53, 69, 0.3);
  border-radius: 8px;
  color: #dc3545;
  text-align: center;
  font-weight: 500;
}

.stop-btn {
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.stop-btn:hover {
  background: #c82333;
}
</style>
