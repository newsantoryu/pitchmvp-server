<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getScore } from '../services/api.js'

const route = useRoute()
const router = useRouter()

const transcriptionId = computed(() => route.params.id)
const transcription = ref(null)
const loading = ref(true)
const error = ref(null)

async function loadTranscription() {
  try {
    loading.value = true
    error.value = null
    
    if (!transcriptionId.value) {
      // Se não tiver ID, redirecionar para home
      router.push('/')
      return
    }
    
    console.log('📊 Carregando detalhes da cifra:', transcriptionId.value)
    const scoreData = await getScore(transcriptionId.value)
    
    // Formatar dados para exibição
    transcription.value = {
      id: scoreData.id,
      title: scoreData.title,
      duration: scoreData.duration,
      language: scoreData.language,
      words: scoreData.words,
      createdAt: new Date().toISOString(), // Backend não tem createdAt, usar atual
      key: extractKey(scoreData.words),
      tempo: estimateTempo(scoreData.words),
      range: calculateRange(scoreData.words)
    }
    
    console.log('✅ Cifra carregada com sucesso!')
  } catch (err) {
    console.error('❌ Erro ao carregar cifra:', err)
    error.value = err.message
    // Se não encontrar, redirecionar para scores
    if (err.message.includes('404') || err.message.includes('não encontrado')) {
      router.push('/scores')
    }
  } finally {
    loading.value = false
  }
}

function goHome() {
  router.push('/')
}

function goBack() {
  router.push('/scores')
}

function exportResults() {
  if (!transcription.value) return
  
  const data = JSON.stringify(transcription.value, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = `transcription-${transcription.value.id || 'latest'}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function formatTime(seconds) {
  if (!seconds) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Funções auxiliares para análise musical
function calculateRange(words) {
  const notesWithPitch = words
    .filter(w => w.note)
    .map(w => w.note)
  
  if (notesWithPitch.length === 0) return null
  
  const noteNumbers = notesWithPitch.map(note => {
    const noteName = note.replace(/[0-9]/g, '')
    const octave = parseInt(note.match(/[0-9]/) || '4')
    const noteMap = { 'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11 }
    return noteMap[noteName] + (octave * 12)
  })
  
  const minNote = Math.min(...noteNumbers)
  const maxNote = Math.max(...noteNumbers)
  
  return {
    lowest: notesWithPitch[noteNumbers.indexOf(minNote)],
    highest: notesWithPitch[noteNumbers.indexOf(maxNote)],
    span: maxNote - minNote
  }
}

function extractKey(words) {
  const notesWithPitch = words
    .filter(w => w.note)
    .map(w => w.note.replace(/[0-9]/g, ''))
  
  if (notesWithPitch.length === 0) return null
  
  const noteCount = {}
  notesWithPitch.forEach(note => {
    noteCount[note] = (noteCount[note] || 0) + 1
  })
  
  const sortedNotes = Object.entries(noteCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([note]) => note)
  
  // Simplificado: retornar a nota mais comum como tom
  return sortedNotes[0] || null
}

function estimateTempo(words) {
  if (words.length < 2) return null
  
  const durations = []
  for (let i = 1; i < words.length; i++) {
    const prevWord = words[i - 1]
    const currWord = words[i]
    
    if (prevWord.end && currWord.start) {
      const duration = currWord.start - prevWord.end
      if (duration > 0 && duration < 2) { // Entre 0.5s e 2s por palavra
        durations.push(duration)
      }
    }
  }
  
  if (durations.length === 0) return null
  
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length
  const estimatedBPM = Math.round(60 / avgDuration)
  
  return Math.max(60, Math.min(200, estimatedBPM)) // Limitar entre 60-200 BPM
}

function getNoteDistribution(words) {
  const noteCount = {}
  
  words.forEach(word => {
    if (word.note) {
      const note = word.note
      noteCount[note] = (noteCount[note] || 0) + 1
    }
  })
  
  return noteCount
}

onMounted(() => {
  loadTranscription()
})
</script>

<template>
  <div class="results-page">
    <!-- Header -->
    <header class="page-header">
      <button @click="goBack" class="back-btn">← Voltar</button>
      <div class="header-content">
        <h1>📊 {{ transcription?.title || 'Carregando...' }}</h1>
        <span class="header-id" v-if="transcription">ID: {{ transcription.id }}</span>
      </div>
    </header>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="loading-card">
        <div class="loading-icon">⏳</div>
        <h2>Carregando transcrição...</h2>
        <p>Buscando dados da cifra</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <div class="error-card">
        <div class="error-icon">❌</div>
        <h2>Erro ao carregar</h2>
        <p>{{ error }}</p>
        <button @click="goBack" class="retry-btn">← Voltar para Cifras</button>
      </div>
    </div>

    <!-- Main Content -->
    <main class="results-content" v-else-if="transcription">
      <!-- Notes Timeline - MAIN VIEW -->
      <section class="pitch-section main-timeline-section">
        <div class="pitch-card">
          <div class="notes-timeline main-view">
            <div class="timeline-stats horizontal">
              <div class="timeline-stat">
                <span class="stat-number">{{ transcription.words.length }}</span>
                <span class="stat-label">Palavras</span>
              </div>
              <div class="timeline-stat">
                <span class="stat-number">{{ transcription.words.filter(w => w.note).length }}</span>
                <span class="stat-label">Notas</span>
              </div>
              <div class="timeline-stat">
                <span class="stat-number">{{ Math.round((transcription.words.filter(w => w.note).length / transcription.words.length) * 100) }}%</span>
                <span class="stat-label">Precisão</span>
              </div>
            </div>
            <div class="timeline-container main-timeline">
              <div 
                v-for="(word, index) in transcription.words"
                :key="index"
                class="note-block main-block"
                :class="{ 'valid': word.note, 'invalid': !word.note }"
                :title="`Tempo: ${formatTime(word.start || index * 0.1)} | Palavra: ${word.text || 'N/A'} | Nota: ${word.note || 'N/A'}`"
              >
                <div class="word-text">{{ word.text || '?' }}</div>
                <div class="word-note">{{ word.note || '-' }}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Summary -->
      <section class="summary-section">
        <div class="summary-card">
          <h2>📋 Resumo da Análise</h2>
          <div class="summary-grid">
            <div class="summary-item">
              <span class="item-label">ID</span>
              <span class="item-value">{{ transcription.id || 'N/A' }}</span>
            </div>
            <div class="summary-item">
              <span class="item-label">Título</span>
              <span class="item-value">{{ transcription.title || 'Sem título' }}</span>
            </div>
            <div class="summary-item">
              <span class="item-label">Duração</span>
              <span class="item-value">{{ formatTime(transcription.duration) }}</span>
            </div>
            <div class="summary-item">
              <span class="item-label">Tom</span>
              <span class="item-value">{{ transcription.key || 'N/A' }}</span>
            </div>
            <div class="summary-item">
              <span class="item-label">Andamento</span>
              <span class="item-value">{{ transcription.tempo || 'N/A' }} BPM</span>
            </div>
            <div class="summary-item">
              <span class="item-label">Idioma</span>
              <span class="item-value">{{ transcription.language?.toUpperCase() || 'N/A' }}</span>
            </div>
            <div class="summary-item">
              <span class="item-label">Data</span>
              <span class="item-value">{{ formatDate(transcription.createdAt) }}</span>
            </div>
            <div class="summary-item">
              <span class="item-label">Status</span>
              <span class="item-value success">✅ Concluído</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Pitch Analysis -->
      <section class="pitch-section">
        <div class="pitch-card">
          <h2>🎵 Análise de Pitch</h2>
          
          <!-- Statistics -->
          <div class="pitch-stats">
            <div class="stat-item">
              <span class="stat-number">{{ transcription.words.length }}</span>
              <span class="stat-label">Notas Detectadas</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">{{ transcription.words.filter(w => w.note).length }}</span>
              <span class="stat-label">Notas Válidas</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">{{ Math.round((transcription.words.filter(w => w.note).length / transcription.words.length) * 100) }}%</span>
              <span class="stat-label">Precisão</span>
            </div>
          </div>

          <!-- Note Distribution -->
          <div class="note-distribution">
            <h3>🎼 Distribuição de Notas</h3>
            <div class="distribution-chart">
              <div 
                v-for="(count, note) in getNoteDistribution(transcription.words)"
                :key="note"
                class="distribution-item"
              >
                <span class="note-name">{{ note }}</span>
                <div class="distribution-bar">
                  <div 
                    class="distribution-fill" 
                    :style="{ width: (count / Math.max(...Object.values(getNoteDistribution(transcription.words))) * 100) + '%' }"
                  ></div>
                </div>
                <span class="note-count">{{ count }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Raw Data -->
      <section class="data-section">
        <div class="data-card">
          <h2>📊 Dados Brutos</h2>
          
          <!-- Actions -->
          <div class="data-actions">
            <button @click="exportResults" class="export-btn">
              📥 Exportar JSON
            </button>
            <button @click="goHome" class="home-btn">
              🏠 Nova Análise
            </button>
          </div>

          <!-- Data Preview -->
          <div class="data-preview">
            <h3>🔍 Preview dos Dados</h3>
            <pre class="json-preview">{{ JSON.stringify(transcription, null, 2) }}</pre>
          </div>
        </div>
      </section>
    </main>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <div class="empty-card">
        <div class="empty-icon">📊</div>
        <h2>Nenhum resultado encontrado</h2>
        <p>Não há resultados para exibir</p>
        <button @click="goHome" class="action-btn">
          🏠 Voltar para Home
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  methods: {
    getNoteDistribution(words) {
      const distribution = {}
      words.forEach(word => {
        if (word.note) {
          distribution[word.note] = (distribution[word.note] || 0) + 1
        }
      })
      return distribution
    }
  }
}
</script>

<style scoped>
.results-page {
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

.header-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.page-header h1 {
  font-size: 2.5rem;
  margin: 0;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.header-id {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
  margin-top: 0.25rem;
}

.back-btn {
  padding: 0.75rem 1.5rem;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.loading-state,
.error-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
}

.loading-card,
.error-card {
  background: rgba(255, 255, 255, 0.95);
  padding: 3rem;
  border-radius: 16px;
  backdrop-filter: blur(10px);
  text-align: center;
  max-width: 400px;
}

.loading-icon,
.error-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.loading-card h2,
.error-card h2 {
  margin-bottom: 1rem;
  color: #333;
}

.loading-card p,
.error-card p {
  color: #666;
  margin-bottom: 2rem;
}

.retry-btn {
  padding: 1rem 2rem;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.retry-btn:hover {
  background: #1976d2;
}

.results-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.summary-section,
.pitch-section,
.data-section {
  display: flex;
  justify-content: center;
}

.summary-card,
.pitch-card,
.data-card {
  background: rgba(255, 255, 255, 0.95);
  padding: 2rem;
  border-radius: 16px;
  backdrop-filter: blur(10px);
  width: 100%;
}

.summary-card h2,
.pitch-card h2,
.data-card h2 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: #333;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.summary-item {
  text-align: center;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.item-label {
  display: block;
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.item-value {
  display: block;
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
}

.item-value.success {
  color: #4caf50;
}

.pitch-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-item {
  text-align: center;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f8f9fa, #e3f2fd);
  border-radius: 8px;
}

.stat-number {
  display: block;
  font-size: 2rem;
  font-weight: 700;
  color: #2196f3;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.9rem;
  color: #666;
}

/* Main Timeline Section */
.main-timeline-section {
  margin-bottom: 2rem;
}

.main-timeline-section .pitch-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(33, 150, 243, 0.05));
  border: 3px solid #2196f3;
  box-shadow: 0 12px 40px rgba(33, 150, 243, 0.2);
  padding: 2.5rem;
}

/* Main Timeline Styles */
.notes-timeline.main-view {
  margin-bottom: 0;
  background: transparent;
  border-radius: 0;
  padding: 0;
  border: none;
}

.timeline-stats.horizontal {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 1.5rem;
}

.timeline-stats.horizontal .timeline-stat {
  text-align: center;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 6px;
  border: 1px solid #e3f2fd;
  min-width: 80px;
}

.timeline-stats.horizontal .timeline-stat .stat-number {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: #1976d2;
  margin-bottom: 0.25rem;
}

.timeline-stats.horizontal .timeline-stat .stat-label {
  font-size: 0.8rem;
  color: #666;
  font-weight: 500;
}

.timeline-container.main-timeline {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1rem;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  max-height: 600px;
  overflow-y: auto;
  border: 2px solid #e3f2fd;
}

.note-block.main-block {
  padding: 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-family: monospace;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 120px;
  max-width: 160px;
  min-height: 90px;
  justify-content: center;
}

.note-block.main-block:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.note-block.main-block .word-text {
  font-weight: 700;
  color: #333;
  text-align: center;
  word-break: break-word;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  line-height: 1.3;
  width: 100%;
  hyphens: auto;
}

.note-block.main-block .word-note {
  font-size: 0.8rem;
  color: #666;
  text-align: center;
  font-weight: 600;
  white-space: nowrap;
}

.note-block.main-block.valid {
  background: linear-gradient(135deg, #e8f5e8, #c8e6c9);
  color: #2e7d32;
  border: 2px solid #4caf50;
}

.note-block.main-block.valid .word-text {
  color: #2e7d32;
}

.note-block.main-block.valid .word-note {
  color: #1b5e20;
  font-weight: 600;
}

.note-block.main-block.invalid {
  background: linear-gradient(135deg, #fafafa, #e0e0e0);
  color: #666;
  border: 2px solid #bdbdbd;
}

.note-block.main-block.invalid .word-text {
  color: #666;
}

.note-block.main-block.invalid .word-note {
  color: #999;
}

.note-block {
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-family: monospace;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 50px;
  max-width: 80px;
}

.word-text {
  font-weight: 600;
  color: #333;
  text-align: center;
  word-break: break-word;
  margin-bottom: 0.25rem;
}

.word-note {
  font-size: 0.6rem;
  color: #666;
  text-align: center;
  font-weight: 500;
}

.note-block.valid {
  background: #e8f5e8;
  color: #2e7d32;
  border: 1px solid #c8e6c9;
}

.note-block.valid .word-text {
  color: #2e7d32;
}

.note-block.valid .word-note {
  color: #1b5e20;
}

.note-block.invalid {
  background: #fafafa;
  color: #666;
  border: 1px solid #e0e0e0;
}

.note-block.invalid .word-text {
  color: #666;
}

.note-block.invalid .word-note {
  color: #999;
}

.note-block:hover {
  transform: scale(1.1);
}

.more-notes {
  padding: 0.25rem 0.5rem;
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
}

.note-distribution h3 {
  margin-bottom: 1rem;
  color: #333;
}

.distribution-chart {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.distribution-item {
  display: grid;
  grid-template-columns: 60px 1fr 40px;
  align-items: center;
  gap: 1rem;
}

.note-name {
  font-family: monospace;
  font-weight: 600;
  color: #333;
}

.distribution-bar {
  height: 20px;
  background: #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
}

.distribution-fill {
  height: 100%;
  background: linear-gradient(90deg, #2196f3, #4caf50);
  transition: width 0.3s ease;
}

.note-count {
  font-weight: 600;
  color: #333;
  text-align: right;
}

.data-actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.export-btn,
.home-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.export-btn {
  background: #4caf50;
  color: white;
}

.export-btn:hover {
  background: #45a049;
}

.home-btn {
  background: #2196f3;
  color: white;
}

.home-btn:hover {
  background: #1976d2;
}

.data-preview h3 {
  margin-bottom: 1rem;
  color: #333;
}

.json-preview {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  font-size: 0.8rem;
  color: #333;
  max-height: 400px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
}

.empty-card {
  background: rgba(255, 255, 255, 0.95);
  padding: 3rem;
  border-radius: 16px;
  backdrop-filter: blur(10px);
  text-align: center;
  max-width: 400px;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-card h2 {
  margin-bottom: 1rem;
  color: #333;
}

.empty-card p {
  color: #666;
  margin-bottom: 2rem;
}

.action-btn {
  padding: 1rem 2rem;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-btn:hover {
  background: #1976d2;
}

@media (max-width: 768px) {
  .results-page {
    padding: 1rem;
  }
  
  .page-header h1 {
    font-size: 1.5rem;
  }
  
  .summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .pitch-stats {
    grid-template-columns: 1fr;
  }
  
  .distribution-item {
    grid-template-columns: 50px 1fr 30px;
    gap: 0.5rem;
  }
  
  .data-actions {
    flex-direction: column;
  }
}
</style>
