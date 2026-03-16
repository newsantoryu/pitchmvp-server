<script setup>
import { ref, computed } from 'vue'

const currentNote = ref('-')
const currentFrequency = ref('0.00 Hz')
const accuracy = ref('-')

const noteColor = computed(() => {
  switch (accuracy.value) {
    case 'correct': return '#4caf50'
    case 'close': return '#ff9800'
    case 'wrong': return '#f44336'
    default: return '#666'
  }
})

function updateNote(note, freq, acc = '-') {
  currentNote.value = note
  currentFrequency.value = freq
  accuracy.value = acc
}

// Expor função para uso externo
defineExpose({
  updateNote
})
</script>

<template>
  <div class="pitch-display">
    <div class="pitch-main">
      <div class="current-note" :style="{ color: noteColor }">
        {{ currentNote }}
      </div>
      <div class="current-frequency">
        {{ currentFrequency }}
      </div>
    </div>
    
    <div class="accuracy-indicator" v-if="accuracy !== '-'">
      <div class="accuracy-dot" :class="accuracy"></div>
      <span class="accuracy-text">
        {{ accuracy === 'correct' ? 'Correto' : accuracy === 'close' ? 'Próximo' : 'Errado' }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.pitch-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: #f5f5f5;
  border-radius: 12px;
  min-width: 200px;
}

.pitch-main {
  text-align: center;
}

.current-note {
  font-size: 3rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
  transition: color 0.3s ease;
}

.current-frequency {
  font-size: 1.2rem;
  color: #666;
  font-family: monospace;
}

.accuracy-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.accuracy-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ccc;
}

.accuracy-dot.correct {
  background: #4caf50;
}

.accuracy-dot.close {
  background: #ff9800;
}

.accuracy-dot.wrong {
  background: #f44336;
}

.accuracy-text {
  font-size: 0.9rem;
  font-weight: 500;
}
</style>
