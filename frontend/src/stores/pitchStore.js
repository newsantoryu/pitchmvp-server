import { defineStore } from "pinia"
import { ref, computed } from "vue"

export const usePitchStore = defineStore("pitch", () => {
  // Estado
  const frequency = ref(0)
  const note = ref("")
  const cents = ref(0)
  const confidence = ref(0)
  const isDetecting = ref(false)
  const isRecording = ref(false)

  // Histórico de pitch
  const pitchHistory = ref([])
  const maxHistoryLength = 100

  // Estatísticas
  const stats = ref({
    averageFrequency: 0,
    mostFrequentNote: "",
    totalSamples: 0,
    sessionDuration: 0
  })

  // Getters computados
  const currentNoteWithOctave = computed(() => {
    if (!note.value) return "-"
    return note.value
  })

  const frequencyFormatted = computed(() => {
    if (frequency.value <= 0) return "0.00 Hz"
    return `${frequency.value.toFixed(2)} Hz`
  })

  const accuracy = computed(() => {
    if (Math.abs(cents.value) <= 5) return "perfect"
    if (Math.abs(cents.value) <= 10) return "good"
    if (Math.abs(cents.value) <= 20) return "fair"
    return "poor"
  })

  const accuracyColor = computed(() => {
    switch (accuracy.value) {
      case "perfect": return "#4caf50"
      case "good": return "#8bc34a"
      case "fair": return "#ffc107"
      case "poor": return "#f44336"
      default: return "#666"
    }
  })

  // Actions
  function updatePitch(data) {
    frequency.value = data.frequency || 0
    note.value = data.note || ""
    cents.value = data.cents || 0
    confidence.value = data.confidence || 0

    // Adicionar ao histórico
    if (frequency.value > 0) {
      addToHistory({
        frequency: frequency.value,
        note: note.value,
        cents: cents.value,
        timestamp: Date.now()
      })
    }

    updateStats()
  }

  function addToHistory(pitchData) {
    pitchHistory.value.push(pitchData)

    // Limitar tamanho do histórico
    if (pitchHistory.value.length > maxHistoryLength) {
      pitchHistory.value.shift()
    }
  }

  function updateStats() {
    const validPitches = pitchHistory.value.filter(p => p.frequency > 0)

    if (validPitches.length === 0) {
      stats.value.averageFrequency = 0
      stats.value.mostFrequentNote = ""
      stats.value.totalSamples = 0
      return
    }

    // Calcular frequência média
    const sumFreq = validPitches.reduce((sum, p) => sum + p.frequency, 0)
    stats.value.averageFrequency = sumFreq / validPitches.length

    // Nota mais frequente
    const noteCounts = {}
    validPitches.forEach(p => {
      noteCounts[p.note] = (noteCounts[p.note] || 0) + 1
    })

    stats.value.mostFrequentNote = Object.keys(noteCounts).reduce((a, b) =>
      noteCounts[a] > noteCounts[b] ? a : b, ""
    )

    stats.value.totalSamples = validPitches.length
  }

  function startDetection() {
    isDetecting.value = true
    console.log("🎯 Detecção de pitch iniciada")
  }

  function stopDetection() {
    isDetecting.value = false
    console.log("⏹️ Detecção de pitch parada")
  }

  function startRecording() {
    isRecording.value = true
    clearHistory()
    console.log("🎤 Gravação iniciada")
  }

  function stopRecording() {
    isRecording.value = false
    console.log("⏹️ Gravação parada")
  }

  function clearHistory() {
    pitchHistory.value = []
    stats.value = {
      averageFrequency: 0,
      mostFrequentNote: "",
      totalSamples: 0,
      sessionDuration: 0
    }
  }

  function reset() {
    frequency.value = 0
    note.value = ""
    cents.value = 0
    confidence.value = 0
    isDetecting.value = false
    isRecording.value = false
    clearHistory()
  }

  // Funções individuais para compatibilidade
  function setFrequency(freq) {
    frequency.value = freq || 0
  }

  function setNote(newNote) {
    note.value = newNote || ""
  }

  function setCents(newCents) {
    cents.value = newCents || 0
  }

  function setConfidence(newConfidence) {
    confidence.value = newConfidence || 0
  }

  function setDetecting(detecting) {
    isDetecting.value = detecting || false
  }

  // Exportar dados
  function exportHistory() {
    return {
      history: pitchHistory.value,
      stats: stats.value,
      exportDate: new Date().toISOString()
    }
  }

  return {
    // Estado
    frequency,
    note,
    cents,
    confidence,
    isDetecting,
    isRecording,
    pitchHistory,
    stats,

    // Getters
    currentNoteWithOctave,
    frequencyFormatted,
    accuracy,
    accuracyColor,

    // Actions
    updatePitch,
    startDetection,
    stopDetection,
    startRecording,
    stopRecording,
    clearHistory,
    reset,
    setFrequency,
    setNote,
    setCents,
    setConfidence,
    setDetecting,
    exportHistory
  }
})
