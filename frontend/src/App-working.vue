<script setup>
import { ref, onMounted } from 'vue'
import Recorder from './components/Recorder-simple.vue'

const message = ref('PitchMVP Vue 3 - Sistema de Detecção de Pitch')
const isRecording = ref(false)

function toggleRecording() {
  isRecording.value = !isRecording.value
  message.value = isRecording.value ? ' Gravando...' : ' Pronto para gravar'
}

onMounted(() => {
  console.log(' App Vue 3 montado com sucesso!')
})
</script>

<template>
  <div class="app">
    <header class="app-header">
      <h1> PitchMVP - Vue 3</h1>
      <p>{{ message }}</p>
    </header>

    <main class="app-main">
      <div class="controls-section">
        <Recorder @toggle-recording="toggleRecording" />
      </div>
      
      <div class="test-section">
        <h2> Teste de Componentes</h2>
        <p>Se você está vendo isso, o Vue 3 está funcionando!</p>
        <button @click="message = 'Botão clicado! Vue reativo funcionando!'" class="test-btn">
          Testar Reactividade
        </button>
      </div>

      <div class="status-section">
        <h2> Status do Sistema</h2>
        <div class="status-grid">
          <div class="status-item">
            <span class="status-label">Gravação:</span>
            <span class="status-value" :class="{ 'active': isRecording }">
              {{ isRecording ? 'Ativa' : 'Inativa' }}
            </span>
          </div>
          <div class="status-item">
            <span class="status-label">Frontend:</span>
            <span class="status-value active">Vue 3 + Vite </span>
          </div>
          <div class="status-item">
            <span class="status-label">Backend:</span>
            <span class="status-value active">Python FastAPI </span>
          </div>
        </div>
      </div>

      <div class="features-section">
        <h2> Features Migradas</h2>
        <div class="features-grid">
          <div class="feature-card">
            <h3> Gravação de Áudio</h3>
            <p>MediaRecorder API + Web Audio API</p>
          </div>
          <div class="feature-card">
            <h3> Detecção de Pitch</h3>
            <p>Essentia.js + Algoritmos do Backend</p>
          </div>
          <div class="feature-card">
            <h3> Conversão de Notas</h3>
            <p>freqToNote() migrado do Python</p>
            <p>Visualização de frequência</p>
          </div>
          <div class="feature-card">
            <h3>🎼 Display de Notas</h3>
            <p>Conversão frequência → nota</p>
          </div>
        </div>
      </div>
    </main>

    <footer class="app-footer">
      <p>Frontend Vue 3 + Vite | Backend Python FastAPI</p>
      <p>📍 Acesse: <a href="http://localhost:8000" target="_blank">Backend API</a></p>
    </footer>
  </div>
</template>

<style scoped>
.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.app-header {
  text-align: center;
  margin-bottom: 3rem;
}

.app-header h1 {
  font-size: 2.5rem;
  color: #2196f3;
  margin-bottom: 0.5rem;
}

.app-header p {
  color: #666;
  font-size: 1.1rem;
  font-weight: 500;
}

.app-main {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.controls-section {
  display: flex;
  justify-content: center;
}

.status-section, .features-section {
  background: #f8f9fa;
  padding: 2rem;
  border-radius: 12px;
  border: 1px solid #e0e0e0;
}

.status-section h2, .features-section h2 {
  color: #333;
  margin-bottom: 1.5rem;
  text-align: center;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.status-label {
  font-weight: 600;
  color: #666;
}

.status-value {
  color: #f44336;
  font-weight: 500;
}

.status-value.active {
  color: #4caf50;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.feature-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  text-align: center;
}

.feature-card h3 {
  color: #2196f3;
  margin-bottom: 0.5rem;
}

.feature-card p {
  color: #666;
  font-size: 0.9rem;
}

.app-footer {
  text-align: center;
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid #e0e0e0;
  color: #666;
}

.app-footer a {
  color: #2196f3;
  text-decoration: none;
}

.app-footer a:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .app {
    padding: 1rem;
  }
  
  .status-grid, .features-grid {
    grid-template-columns: 1fr;
  }
}
</style>
