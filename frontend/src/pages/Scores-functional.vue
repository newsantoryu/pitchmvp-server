<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// Dados mock das cifras (simulando dados do backend)
const transcriptions = ref([
  {
    id: '1',
    title: 'Música Exemplo 1',
    artist: 'Artista Famoso',
    duration: 180,
    tempo: 120,
    key: 'C Major',
    createdAt: '2024-03-16T10:30:00Z',
    words: [
      { time: 0, note: 'C4', word: 'Hello' },
      { time: 1, note: 'E4', word: 'world' },
      { time: 2, note: 'G4', word: 'this' },
      { time: 3, note: 'C5', word: 'is' },
      { time: 4, note: 'E4', word: 'beautiful' }
    ]
  },
  {
    id: '2',
    title: 'Música Exemplo 2',
    artist: 'Banda Popular',
    duration: 240,
    tempo: 95,
    key: 'G Major',
    createdAt: '2024-03-16T09:15:00Z',
    words: [
      { time: 0, note: 'G4', word: 'Another' },
      { time: 1, note: 'B4', word: 'song' },
      { time: 2, note: 'D5', word: 'in' },
      { time: 3, note: 'G5', word: 'the' },
      { time: 4, note: 'D5', word: 'night' }
    ]
  },
  {
    id: '3',
    title: 'Balada Romântica',
    artist: 'Cantor Romântico',
    duration: 200,
    tempo: 80,
    key: 'A Minor',
    createdAt: '2024-03-16T08:45:00Z',
    words: [
      { time: 0, note: 'A3', word: 'Love' },
      { time: 1, note: 'C4', word: 'is' },
      { time: 2, note: 'E4', word: 'all' },
      { time: 3, note: 'A4', word: 'around' }
    ]
  }
])

const selectedTranscription = ref(null)
const isDetailView = ref(false)

function goHome() {
  router.push('/')
}

function viewTranscription(id) {
  selectedTranscription.value = transcriptions.value.find(t => t.id === id)
  isDetailView.value = true
}

function deleteTranscription(id) {
  if (confirm('Tem certeza que deseja deletar esta transcrição?')) {
    transcriptions.value = transcriptions.value.filter(t => t.id !== id)
    if (selectedTranscription.value?.id === id) {
      selectedTranscription.value = null
      isDetailView.value = false
    }
  }
}

function backToList() {
  isDetailView.value = false
  selectedTranscription.value = null
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

function formatDuration(seconds) {
  if (!seconds) return '-'
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

function exportTranscription(transcription) {
  const data = JSON.stringify(transcription, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = `cifra-${transcription.id}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function getNoteDistribution(words) {
  const distribution = {}
  words.forEach(word => {
    if (word.note) {
      distribution[word.note] = (distribution[word.note] || 0) + 1
    }
  })
  return distribution
}

function getMostFrequentNote(words) {
  const distribution = getNoteDistribution(words)
  let maxCount = 0
  let mostFrequent = '-'
  
  for (const [note, count] of Object.entries(distribution)) {
    if (count > maxCount) {
      maxCount = count
      mostFrequent = note
    }
  }
  
  return mostFrequent
}
</script>

<template>
  <div class="scores-page">
    <!-- Header -->
    <header class="page-header">
      <button @click="goHome" class="back-btn">← Home</button>
      <h1>📚 Minhas Cifras</h1>
    </header>

    <!-- Main Content -->
    <main class="scores-content">
      <!-- Lista de Transcrições -->
      <div v-if="!isDetailView" class="list-view">
        <div class="list-header">
          <h2>📋 Transcrições Salvas</h2>
          <div class="stats">
            <span class="stat">{{ transcriptions.length }} transcrições</span>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="transcriptions.length === 0" class="empty-state">
          <div class="empty-icon">🎼</div>
          <h3>Nenhuma cifra encontrada</h3>
          <p>Você ainda não tem transcrições salvas</p>
          <div class="empty-actions">
            <a href="/upload" class="action-btn primary">📁 Fazer Upload</a>
            <a href="/transcription" class="action-btn secondary">🔗 Usar URL</a>
          </div>
        </div>

        <!-- Transcriptions Grid -->
        <div v-else class="transcriptions-grid">
          <div 
            v-for="transcription in transcriptions"
            :key="transcription.id"
            class="transcription-card"
          >
            <div class="card-header">
              <h3>{{ transcription.title }}</h3>
              <div class="card-actions">
                <button 
                  @click="viewTranscription(transcription.id)"
                  class="action-btn view"
                  title="Ver detalhes"
                >
                  👁️
                </button>
                <button 
                  @click="deleteTranscription(transcription.id)"
                  class="action-btn delete"
                  title="Deletar"
                >
                  🗑️
                </button>
              </div>
            </div>

            <div class="card-content">
              <div class="metadata">
                <div class="meta-item">
                  <span class="meta-icon">🎤</span>
                  <span class="meta-text">{{ transcription.artist }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-icon">📅</span>
                  <span class="meta-text">{{ formatDate(transcription.createdAt) }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-icon">⏱️</span>
                  <span class="meta-text">{{ formatDuration(transcription.duration) }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-icon">🎵</span>
                  <span class="meta-text">{{ transcription.tempo }} BPM</span>
                </div>
                <div class="meta-item">
                  <span class="meta-icon">🎹</span>
                  <span class="meta-text">{{ transcription.key }}</span>
                </div>
              </div>

              <div class="preview">
                <h4>📝 Preview</h4>
                <div class="notes-preview">
                  <span 
                    v-for="(word, index) in transcription.words.slice(0, 6)"
                    :key="index"
                    class="note-chip"
                  >
                    {{ word.note }}
                  </span>
                  <span v-if="transcription.words.length > 6" class="more-notes">
                    +{{ transcription.words.length - 6 }}
                  </span>
                </div>
              </div>
            </div>

            <div class="card-footer">
              <button 
                @click="viewTranscription(transcription.id)"
                class="view-full-btn"
              >
                Ver Cifra Completa
              </button>
            </div>
          </div>
        </div>

        <!-- Bulk Actions -->
        <div class="bulk-actions" v-if="transcriptions.length > 0">
          <button class="bulk-btn secondary">
            📥 Exportar Todas
          </button>
        </div>
      </div>

      <!-- Detalhe da Transcrição -->
      <div v-else-if="selectedTranscription" class="detail-view">
        <div class="detail-header">
          <button @click="backToList" class="back-btn">← Voltar</button>
          <div class="detail-title">
            <h2>{{ selectedTranscription.title }}</h2>
            <p>{{ selectedTranscription.artist }}</p>
          </div>
          <div class="detail-actions">
            <button 
              @click="exportTranscription(selectedTranscription)"
              class="export-btn"
            >
              📥 Exportar
            </button>
          </div>
        </div>

        <!-- Informações da Música -->
        <section class="song-info">
          <div class="info-card">
            <h3>📋 Informações da Música</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Duração:</span>
                <span class="info-value">{{ formatDuration(selectedTranscription.duration) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Andamento:</span>
                <span class="info-value">{{ selectedTranscription.tempo }} BPM</span>
              </div>
              <div class="info-item">
                <span class="info-label">Tom:</span>
                <span class="info-value">{{ selectedTranscription.key }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Criado em:</span>
                <span class="info-value">{{ formatDate(selectedTranscription.createdAt) }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Estatísticas -->
        <section class="stats-section">
          <div class="stats-card">
            <h3>📊 Estatísticas</h3>
            <div class="stats-grid">
              <div class="stat-item">
                <span class="stat-number">{{ selectedTranscription.words.length }}</span>
                <span class="stat-label">Notas Detectadas</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">{{ getMostFrequentNote(selectedTranscription.words) }}</span>
                <span class="stat-label">Nota Mais Comum</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">{{ Object.keys(getNoteDistribution(selectedTranscription.words)).length }}</span>
                <span class="stat-label">Notas Diferentes</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Cifra Completa -->
        <section class="chord-section">
          <div class="chord-card">
            <h3>🎼 Cifra Completa</h3>
            <div class="chord-content">
              <div class="chord-timeline">
                <div 
                  v-for="(word, index) in selectedTranscription.words"
                  :key="index"
                  class="chord-item"
                >
                  <div class="chord-time">{{ word.time }}s</div>
                  <div class="chord-note">{{ word.note }}</div>
                  <div class="chord-word">{{ word.word }}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Distribuição de Notas -->
        <section class="distribution-section">
          <div class="distribution-card">
            <h3>📈 Distribuição de Notas</h3>
            <div class="distribution-chart">
              <div 
                v-for="(count, note) in getNoteDistribution(selectedTranscription.words)"
                :key="note"
                class="distribution-item"
              >
                <span class="note-name">{{ note }}</span>
                <div class="distribution-bar">
                  <div 
                    class="distribution-fill" 
                    :style="{ 
                      width: (count / Math.max(...Object.values(getNoteDistribution(selectedTranscription.words))) * 100) + '%' 
                    }"
                  ></div>
                </div>
                <span class="note-count">{{ count }}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.scores-page {
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

.scores-content {
  max-width: 1200px;
  margin: 0 auto;
}

/* Lista View */
.list-view {
  background: rgba(255, 255, 255, 0.95);
  padding: 2rem;
  border-radius: 16px;
  backdrop-filter: blur(10px);
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.list-header h2 {
  margin: 0;
  color: #333;
}

.stats .stat {
  background: #f5f5f5;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  color: #666;
}

.empty-state {
  text-align: center;
  padding: 3rem;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  margin-bottom: 1rem;
  color: #333;
}

.empty-state p {
  color: #666;
  margin-bottom: 2rem;
}

.empty-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.action-btn {
  padding: 1rem 2rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
}

.action-btn.primary {
  background: #2196f3;
  color: white;
}

.action-btn.primary:hover {
  background: #1976d2;
}

.action-btn.secondary {
  background: #f5f5f5;
  color: #333;
  border: 1px solid #e0e0e0;
}

.action-btn.secondary:hover {
  background: #e0e0e0;
}

.transcriptions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.transcription-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: all 0.3s ease;
}

.transcription-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.5rem 1.5rem 1rem;
  border-bottom: 1px solid #f0f0f0;
}

.card-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.1rem;
  line-height: 1.4;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
}

.card-actions .action-btn {
  padding: 0.5rem;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.3s ease;
}

.card-actions .action-btn.view:hover {
  background: #e3f2fd;
}

.card-actions .action-btn.delete:hover {
  background: #ffebee;
}

.card-content {
  padding: 1rem 1.5rem;
}

.metadata {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.meta-icon {
  font-size: 1rem;
}

.meta-text {
  color: #666;
}

.preview h4 {
  margin: 0 0 0.75rem 0;
  font-size: 0.9rem;
  color: #333;
}

.notes-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.note-chip {
  background: #f5f5f5;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-family: monospace;
  color: #333;
}

.more-notes {
  background: #e0e0e0;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  color: #666;
}

.card-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #f0f0f0;
}

.view-full-btn {
  width: 100%;
  padding: 0.75rem;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.view-full-btn:hover {
  background: #1976d2;
}

.bulk-actions {
  display: flex;
  justify-content: center;
  margin-top: 2rem;
}

.bulk-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.bulk-btn.secondary {
  background: #f5f5f5;
  color: #333;
  border: 1px solid #e0e0e0;
}

.bulk-btn.secondary:hover {
  background: #e0e0e0;
}

/* Detail View */
.detail-view {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.detail-header {
  background: rgba(255, 255, 255, 0.95);
  padding: 2rem;
  border-radius: 16px;
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
  flex-wrap: wrap;
}

.detail-title h2 {
  margin: 0 0 0.5rem 0;
  color: #333;
  font-size: 1.8rem;
}

.detail-title p {
  margin: 0;
  color: #666;
  font-size: 1.1rem;
}

.export-btn {
  padding: 0.75rem 1.5rem;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.export-btn:hover {
  background: #45a049;
}

.song-info,
.stats-section,
.chord-section,
.distribution-section {
  display: flex;
  justify-content: center;
}

.info-card,
.stats-card,
.chord-card,
.distribution-card {
  background: rgba(255, 255, 255, 0.95);
  padding: 2rem;
  border-radius: 16px;
  backdrop-filter: blur(10px);
  width: 100%;
  max-width: 800px;
}

.info-card h3,
.stats-card h3,
.chord-card h3,
.distribution-card h3 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: #333;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.info-label {
  font-weight: 600;
  color: #666;
}

.info-value {
  font-weight: 600;
  color: #333;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
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

.chord-timeline {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 400px;
  overflow-y: auto;
}

.chord-item {
  display: grid;
  grid-template-columns: 60px 80px 1fr;
  gap: 1rem;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 8px;
  align-items: center;
}

.chord-time {
  font-family: monospace;
  font-weight: 600;
  color: #666;
}

.chord-note {
  font-family: monospace;
  font-weight: 700;
  color: #2196f3;
  background: #e3f2fd;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  text-align: center;
}

.chord-word {
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

@media (max-width: 768px) {
  .scores-page {
    padding: 1rem;
  }
  
  .page-header h1 {
    font-size: 1.5rem;
  }
  
  .transcriptions-grid {
    grid-template-columns: 1fr;
  }
  
  .detail-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .chord-item {
    grid-template-columns: 50px 70px 1fr;
    gap: 0.5rem;
  }
  
  .distribution-item {
    grid-template-columns: 50px 1fr 30px;
    gap: 0.5rem;
  }
}
</style>
