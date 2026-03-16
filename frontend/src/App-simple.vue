<script setup>
import { ref, onMounted } from 'vue'
import Recorder from './components/Recorder.vue'

const message = ref('PitchMVP Vue 3 - Carregado com sucesso!')

onMounted(() => {
  console.log('🎵 App Vue 3 montado com sucesso!')
})
</script>

<template>
  <div class="app">
    <header class="app-header">
      <h1>🎵 PitchMVP - Vue 3</h1>
      <p>{{ message }}</p>
    </header>

    <main class="app-main">
      <div class="controls-section">
        <Recorder />
      </div>
      
      <div class="test-section">
        <h2>✅ Teste de Componentes</h2>
        <p>Se você está vendo isso, o Vue 3 está funcionando!</p>
        <button @click="message = 'Botão clicado! Vue reativo funcionando!'" class="test-btn">
          Testar Reactividade
        </button>
      </div>
    </main>

    <footer class="app-footer">
      <p>Frontend Vue 3 + Vite | Backend Python FastAPI</p>
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

.test-section {
  text-align: center;
  padding: 2rem;
  background: #f5f5f5;
  border-radius: 8px;
}

.test-btn {
  padding: 1rem 2rem;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  margin-top: 1rem;
}

.test-btn:hover {
  background: #45a049;
}

.app-footer {
  text-align: center;
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid #e0e0e0;
  color: #666;
}
</style>
