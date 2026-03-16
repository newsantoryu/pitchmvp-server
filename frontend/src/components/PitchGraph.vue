<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const canvas = ref(null)
const isDrawing = ref(false)
const pitchHistory = ref([])
const maxHistory = 100

function startDrawing() {
  isDrawing.value = true
  pitchHistory.value = []
  requestAnimationFrame(draw)
}

function stopDrawing() {
  isDrawing.value = false
}

function addPitchPoint(frequency) {
  if (isDrawing.value) {
    pitchHistory.value.push({
      frequency: frequency,
      timestamp: Date.now()
    })
    
    // Mantém apenas os últimos pontos
    if (pitchHistory.value.length > maxHistory) {
      pitchHistory.value.shift()
    }
  }
}

function draw() {
  if (!canvas.value || !isDrawing.value) return
  
  const ctx = canvas.value.getContext('2d')
  const width = canvas.value.width
  const height = canvas.value.height
  
  // Limpa canvas
  ctx.clearRect(0, 0, width, height)
  
  // Desenha fundo
  ctx.fillStyle = '#f8f9fa'
  ctx.fillRect(0, 0, width, height)
  
  // Desenha linha do meio
  ctx.strokeStyle = '#e0e0e0'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, height / 2)
  ctx.lineTo(width, height / 2)
  ctx.stroke()
  
  // Desenha histórico de pitch
  if (pitchHistory.value.length > 1) {
    ctx.strokeStyle = '#2196f3'
    ctx.lineWidth = 2
    ctx.beginPath()
    
    pitchHistory.value.forEach((point, index) => {
      const x = (index / maxHistory) * width
      const y = height - (point.frequency / 1000) * height // Frequência normalizada
      
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    
    ctx.stroke()
  }
  
  if (isDrawing.value) {
    requestAnimationFrame(draw)
  }
}

function resizeCanvas() {
  if (canvas.value) {
    canvas.value.width = canvas.value.offsetWidth
    canvas.value.height = canvas.value.offsetHeight
  }
}

onMounted(() => {
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  stopDrawing()
})

// Expor funções para uso externo
defineExpose({
  startDrawing,
  stopDrawing,
  addPitchPoint
})
</script>

<template>
  <div class="pitch-graph">
    <canvas 
      ref="canvas"
      class="graph-canvas"
      width="400"
      height="200"
    ></canvas>
    
    <div class="graph-controls">
      <button 
        @click="isDrawing ? stopDrawing() : startDrawing()"
        class="control-btn"
      >
        {{ isDrawing ? 'Parar' : 'Iniciar' }} Gráfico
      </button>
    </div>
  </div>
</template>

<style scoped>
.pitch-graph {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

.graph-canvas {
  width: 100%;
  height: 200px;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
}

.graph-controls {
  display: flex;
  justify-content: center;
}

.control-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #2196f3;
  background: white;
  color: #2196f3;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.control-btn:hover {
  background: #2196f3;
  color: white;
}
</style>
