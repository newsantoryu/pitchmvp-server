<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTranscriptionStore } from '../stores/transcriptionStore.js'

const router = useRouter()
const transcriptionStore = useTranscriptionStore()

const transcriptions = computed(() => transcriptionStore.transcriptions)

function goHome() {
  router.push('/')
}

function viewTranscription(id) {
  router.push(`/results/${id}`)
}

function deleteTranscription(id) {
  if (confirm('Tem certeza que deseja deletar esta transcrição?')) {
    transcriptionStore.deleteTranscription(id)
  }
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

function formatDuration(duration) {
  if (!duration) return '-'
  const minutes = Math.floor(duration / 60)
  const seconds = Math.floor(duration % 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
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
      <!-- Empty State -->
      <div v-if="transcriptions.length === 0" class="empty-state">
        <div class="empty-card">
          <div class="empty-icon">🎼</div>
          <h2>Nenhuma cifra encontrada</h2>
          <p>Você ainda não tem transcrições salvas</p>
          <div class="empty-actions">
            <button @click="router.push('/upload')" class="action-btn primary">
              📁 Fazer Upload
            </button>
            <button @click="router.push('/transcription')" class="action-btn secondary">
              🔗 Usar URL
            </button>
          </div>
        </div>
      </div>

      <!-- Transcriptions List -->
      <div v-else class="transcriptions-section">
        <div class="section-header">
          <h2>📋 Todas as Transcrições</h2>
          <div class="stats">
            <span class="stat">{{ transcriptions.length }} transcrições</span>
          </div>
        </div>

        <div class="transcriptions-grid">
          <div 
            v-for="transcription in transcriptions"
            :key="transcription.id"
            class="transcription-card"
          >
            <div class="card-header">
              <h3>{{ transcription.title || 'Transcrição ' + transcription.id.slice(0, 8) }}</h3>
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
                  <span class="meta-icon">📅</span>
                  <span class="meta-text">{{ formatDate(transcription.createdAt) }}</span>
                </div>
                <div class="meta-item" v-if="transcription.duration">
                  <span class="meta-icon">⏱️</span>
                  <span class="meta-text">{{ formatDuration(transcription.duration) }}</span>
                </div>
                <div class="meta-item" v-if="transcription.tempo">
                  <span class="meta-icon">🎵</span>
                  <span class="meta-text">{{ transcription.tempo }} BPM</span>
                </div>
                <div class="meta-item" v-if="transcription.key">
                  <span class="meta-icon">🎹</span>
                  <span class="meta-text">{{ transcription.key }}</span>
                </div>
              </div>

              <div class="preview" v-if="transcription.words && transcription.words.length > 0">
                <h4>📝 Preview</h4>
                <div class="notes-preview">
                  <span 
                    v-for="(word, index) in transcription.words.slice(0, 8)"
                    :key="index"
                    class="note-chip"
                  >
                    {{ word.note || '-' }}
                  </span>
                  <span v-if="transcription.words.length > 8" class="more-notes">
                    +{{ transcription.words.length - 8 }}
                  </span>
                </div>
              </div>
            </div>

            <div class="card-footer">
              <button 
                @click="viewTranscription(transcription.id)"
                class="view-full-btn"
              >
                Ver Transcrição Completa
              </button>
            </div>
          </div>
        </div>

        <!-- Bulk Actions -->
        <div class="bulk-actions">
          <button 
            @click="transcriptionStore.clearTranscriptions()"
            class="bulk-btn danger"
            v-if="transcriptions.length > 0"
          >
            🗑️ Limpar Todas
          </button>
          
          <button 
            @click="transcriptionStore.exportTranscriptions()"
            class="bulk-btn secondary"
            v-if="transcriptions.length > 0"
          >
            📥 Exportar Dados
          </button>
        </div>
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

.empty-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.action-btn {
  padding: 1rem 2rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
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

.transcriptions-section {
  background: rgba(255, 255, 255, 0.95);
  padding: 2rem;
  border-radius: 16px;
  backdrop-filter: blur(10px);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.section-header h2 {
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
  gap: 1rem;
  flex-wrap: wrap;
}

.bulk-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.bulk-btn.danger {
  background: #f44336;
  color: white;
}

.bulk-btn.danger:hover {
  background: #d32f2f;
}

.bulk-btn.secondary {
  background: #f5f5f5;
  color: #333;
  border: 1px solid #e0e0e0;
}

.bulk-btn.secondary:hover {
  background: #e0e0e0;
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
  
  .card-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .card-actions {
    align-self: flex-end;
  }
  
  .bulk-actions {
    flex-direction: column;
  }
}
</style>
