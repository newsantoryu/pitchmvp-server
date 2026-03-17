<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { getAllTranscriptions, deleteTranscription, updateTranscriptionTitle } from '../services/pitchService.js'

const router = useRouter()
const scores = ref([])
const loading = ref(true)
const error = ref(null)
const editingId = ref(null)
const editingTitle = ref('')

const scoresSorted = computed(() => 
  scores.value.sort((a, b) => b.id - a.id)
)

async function loadScores() {
  try {
    loading.value = true
    error.value = null
    scores.value = await getAllTranscriptions()
    console.log('📚 Cifras carregadas:', scores.value.length)
  } catch (err) {
    console.error('❌ Erro ao carregar cifras:', err)
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function goHome() {
  router.push('/')
}

function viewTranscription(id) {
  router.push(`/results/${id}`)
}

async function deleteScoreItem(id) {
  if (confirm('Tem certeza que deseja deletar esta cifra?')) {
    try {
      await deleteTranscription(id)
      // Remover da lista local
      scores.value = scores.value.filter(s => s.id !== id)
      console.log('🗑️ Cifra deletada:', id)
    } catch (err) {
      console.error('❌ Erro ao deletar cifra:', err)
      error.value = err.message
    }
  }
}

function startEditing(score) {
  editingId.value = score.id
  editingTitle.value = score.title
  
  // Focar no input automaticamente
  nextTick(() => {
    const input = document.querySelector('.edit-input')
    if (input) {
      input.focus()
      input.select()
    }
  })
}

async function saveEdit(id) {
  try {
    console.log('💾 Atualizando título da cifra:', id, editingTitle.value)
    const updatedScore = await updateTranscriptionTitle(id, editingTitle.value)
    
    // Atualizar na lista local
    const scoreIndex = scores.value.findIndex(s => s.id === id)
    if (scoreIndex > -1) {
      scores.value[scoreIndex] = updatedScore
    }
    
    console.log('✅ Título atualizado com sucesso!')
    cancelEdit()
  } catch (err) {
    console.error('❌ Erro ao atualizar título:', err)
    error.value = err.message
  }
}

function cancelEdit() {
  editingId.value = null
  editingTitle.value = ''
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

onMounted(() => {
  loadScores()
})
</script>

<template>
  <div class="scores-page">
    <!-- Header -->
    <header class="page-header">
      <button @click="goHome" class="back-btn">← Home</button>
      <h1>📚 Minhas Cifras</h1>
    </header>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="loading-card">
        <div class="loading-icon">⏳</div>
        <h2>Carregando cifras...</h2>
        <p>Buscando suas transcrições salvas</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <div class="error-card">
        <div class="error-icon">❌</div>
        <h2>Erro ao carregar</h2>
        <p>{{ error }}</p>
        <button @click="loadScores" class="retry-btn">🔄 Tentar novamente</button>
      </div>
    </div>

    <!-- Scores List -->
    <div v-else-if="scoresSorted.length > 0" class="scores-list">
      <div 
        v-for="score in scoresSorted" 
        :key="score.id"
        class="score-card"
        @click="viewTranscription(score.id)"
      >
        <div class="score-header">
          <div v-if="editingId === score.id" class="edit-form" @click.stop>
            <input 
              v-model="editingTitle" 
              @keyup.enter="saveEdit(score.id)"
              @keyup.escape="cancelEdit()"
              @click.stop
              class="edit-input"
              placeholder="Digite o título..."
              ref="editInput"
            />
            <div class="edit-actions">
              <button @click.stop="saveEdit(score.id)" class="save-btn" title="Salvar">
                💾
              </button>
              <button @click.stop="cancelEdit" class="cancel-btn" title="Cancelar">
                ❌
              </button>
            </div>
          </div>
          <div v-else class="title-display" @click.stop>
            <h3>{{ score.title }}</h3>
            <div class="title-actions">
              <button @click.stop="startEditing(score)" class="edit-title-btn" title="Editar título">
                ✏️
              </button>
              <span class="score-id">#{{ score.id }}</span>
            </div>
          </div>
        </div>
        
        <div class="score-info">
          <div class="info-item">
            <span class="info-label">Duração</span>
            <span class="info-value">{{ formatDuration(score.duration) }}</span>
          </div>
          
          <div class="info-item">
            <span class="info-label">Idioma</span>
            <span class="info-value">{{ score.language.toUpperCase() }}</span>
          </div>
          
          <div class="info-item">
            <span class="info-label">Palavras</span>
            <span class="info-value">{{ score.words ? score.words.length : 0 }}</span>
          </div>
        </div>
        
        <div class="score-actions">
          <button 
            @click.stop="viewTranscription(score.id)" 
            class="view-btn"
          >
            👁️ Ver
          </button>
          
          <button 
            @click.stop="deleteScoreItem(score.id)" 
            class="delete-btn"
          >
            🗑️ Deletar
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <div class="empty-card">
        <div class="empty-icon">📚</div>
        <h2>Nenhuma cifra encontrada</h2>
        <p>Você ainda não tem transcrições salvas.</p>
        <button @click="goHome" class="action-btn">
          🎵 Criar Primeira Cifra
        </button>
      </div>
    </div>
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

.scores-list {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.score-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.score-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.score-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e0e0e0;
}

.edit-form {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.edit-input {
  flex: 1;
  padding: 0.5rem;
  border: 2px solid #2196f3;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  background: white;
  outline: none;
}

.edit-input:focus {
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
}

.edit-actions {
  display: flex;
  gap: 0.25rem;
}

.save-btn,
.cancel-btn {
  padding: 0.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.save-btn {
  background: #4caf50;
  color: white;
}

.save-btn:hover {
  background: #45a049;
}

.cancel-btn {
  background: #f44336;
  color: white;
}

.cancel-btn:hover {
  background: #d32f2f;
}

.title-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.title-display h3 {
  margin: 0;
  color: #333;
  font-size: 1.2rem;
  flex: 1;
}

.title-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.edit-title-btn {
  padding: 0.25rem 0.5rem;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.edit-title-btn:hover {
  background: #1976d2;
}

.score-id {
  background: #2196f3;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
}

.score-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.info-item {
  text-align: center;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.info-label {
  display: block;
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 0.25rem;
}

.info-value {
  display: block;
  font-size: 1rem;
  font-weight: 600;
  color: #333;
}

.score-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.view-btn,
.delete-btn {
  flex: 1;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.view-btn {
  background: #4caf50;
  color: white;
}

.view-btn:hover {
  background: #45a049;
}

.delete-btn {
  background: #f44336;
  color: white;
}

.delete-btn:hover {
  background: #d32f2f;
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
