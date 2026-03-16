<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTranscriptionStore } from '../stores/transcriptionStore.js'

const route = useRoute()
const router = useRouter()
const transcriptionStore = useTranscriptionStore()

const transcriptionId = computed(() => route.params.id)
const transcription = computed(() => {
  return transcriptionStore.getTranscription(transcriptionId.value) || transcriptionStore.latestTranscription
})

function goHome() {
  router.push('/')
}

function goBack() {
  router.back()
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

onMounted(() => {
  // Se não houver transcrição, redirecionar para home
  if (!transcription.value) {
    router.push('/')
  }
})
</script>

<template>
  <div class="results-page">
    <!-- Header -->
    <header class="page-header">
      <button @click="goBack" class="back-btn">← Voltar</button>
      <h1>📊 Resultados</h1>
    </header>

    <!-- Main Content -->
    <main class="results-content" v-if="transcription">
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
      <section class="pitch-section" v-if="transcription.words && transcription.words.length > 0">
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

          <!-- Notes Timeline -->
          <div class="notes-timeline">
            <h3>📈 Linha do Tempo</h3>
            <div class="timeline-container">
              <div 
                v-for="(word, index) in transcription.words.slice(0, 50)"
                :key="index"
                class="note-block"
                :class="{ 'valid': word.note, 'invalid': !word.note }"
                :title="`Tempo: ${formatTime(word.time || index * 0.1)} | Nota: ${word.note || 'N/A'}`"
              >
                {{ word.note || '-' }}
              </div>
              <div v-if="transcription.words.length > 50" class="more-notes">
                +{{ transcription.words.length - 50 }} notas
              </div>
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

.notes-timeline {
  margin-bottom: 2rem;
}

.notes-timeline h3 {
  margin-bottom: 1rem;
  color: #333;
}

.timeline-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.note-block {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-family: monospace;
  cursor: pointer;
  transition: all 0.3s ease;
}

.note-block.valid {
  background: #e8f5e8;
  color: #2e7d32;
  border: 1px solid #c8e6c9;
}

.note-block.invalid {
  background: #fafafa;
  color: #666;
  border: 1px solid #e0e0e0;
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
