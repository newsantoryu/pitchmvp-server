<script setup>
import { ref } from 'vue'

const message = ref('Vue 3 está funcionando!')
const count = ref(0)

function increment() {
  count.value++
}
</script>

<template>
  <div style="padding: 2rem; text-align: center; font-family: sans-serif;">
    <h1 style="color: #2196f3; margin-bottom: 2rem;">
      🎵 PitchMVP - Vue 3 Test
    </h1>
    
    <div style="background: #f5f5f5; padding: 2rem; border-radius: 8px; margin-bottom: 2rem;">
      <h2>{{ message }}</h2>
      <p>Contador: {{ count }}</p>
      <button 
        @click="increment" 
        style="padding: 1rem 2rem; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer;"
      >
        Clicar (+1)
      </button>
    </div>
    
    <div style="background: #e3f2fd; padding: 2rem; border-radius: 8px;">
      <h3>✅ Status do Sistema</h3>
      <p>Frontend: Vue 3 + Vite ✅</p>
      <p>Backend: Python FastAPI ✅</p>
      <p>Porta: {{ $route?.path || 'N/A' }}</p>
    </div>
  </div>
</template>
