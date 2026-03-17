import { defineStore } from "pinia"
import { ref, computed } from "vue"
import { sendAudio, getTranscription, checkJobStatus } from "../services/pitchService.js"

export const useTranscriptionStore = defineStore("transcription", () => {
  // Estado
  const currentJob = ref(null)
  const transcriptions = ref([])
  const isProcessing = ref(false)
  const progress = ref(0)
  const error = ref(null)

  // Getters
  const hasActiveJob = computed(() => currentJob.value !== null)
  const jobStatus = computed(() => currentJob.value?.status || "idle")
  const latestTranscription = computed(() => transcriptions.value[0] || null)

  // Actions
  async function transcribeAudioFile(file, options = {}) {
    try {
      isProcessing.value = true
      progress.value = 0
      error.value = null

      console.log(" Enviando arquivo para transcrição:", file.name)
      console.log(" Idioma da transcrição:", options.language || 'en')
      console.log(" Gênero vocal:", options.voiceGender || 'auto')

      // Enviar arquivo com timeout de 40 minutos (transcribeFile já tem timeout)
      const response = await sendAudio(file, {
        voiceGender: options.voiceGender || "auto",
        language: options.language || "en"
      })
      currentJob.value = response

      // Polling do job (com timeout de 40 minutos no polling)
      await pollJob(response.job_id)

      return response

    } catch (err) {
      console.error(" Erro na transcrição:", err)
      error.value = err.message
      isProcessing.value = false
      throw err
    }
  }

  async function transcribeAudioUrl(url, options = {}) {
    try {
      isProcessing.value = true
      progress.value = 0
      error.value = null

      console.log("🔗 Enviando URL para transcrição:", url)

      // Enviar URL com parâmetros essenciais
      const response = await transcribeUrl(
        url,
        options.anonKey || "",
        options.voiceGender || "auto",
        options.language || "en"
      )
      currentJob.value = response

      // Polling do job
      await pollJob(response.job_id)

      return response

    } catch (err) {
      console.error("❌ Erro na transcrição da URL:", err)
      error.value = err.message
      throw err
    }
  }

  async function pollJob(jobId) {
    // Sem limite de tentativas - polling infinito até completar
    let attempts = 0

    while (true) { // Loop infinito
      try {
        const job = await checkJobStatus(jobId)
        currentJob.value = job

        console.log(' Status do job:', job.status, 'Progress:', job.progress)

        // Atualizar progresso baseado no status do backend
        if (job.status === "queued") {
          progress.value = Math.min(10, attempts * 2)
        } else if (job.status === "transcribing") {
          progress.value = Math.min(70, 10 + (attempts * 2))
        } else if (job.status === "pitch") {
          progress.value = Math.min(90, 70 + (attempts * 2))
        } else if (job.status === "done") {
          progress.value = 100

          // Buscar dados completos do score
          if (job.result && job.result.score_id) {
            try {
              console.log(' Buscando dados completos do score:', job.result.score_id)
              const scoreData = await getScore(job.result.score_id)

              // Adicionar aos resultados com dados completos
              addTranscription({
                id: jobId,
                scoreId: job.result.score_id,
                title: scoreData.title,
                duration: scoreData.duration,
                language: scoreData.language,
                words: scoreData.words,
                range: job.result.range || calculateRange(scoreData.words),
                key: extractKey(scoreData.words),
                tempo: estimateTempo(scoreData.words),
                createdAt: new Date().toISOString()
              })

              console.log(' Transcrição salva com dados completos!')
            } catch (err) {
              console.error(' Erro ao buscar dados do score:', err)
              // Fallback: usar dados básicos do job
              addTranscription({
                id: jobId,
                ...job.result,
                createdAt: new Date().toISOString()
              })
            }
          } else {
            // Fallback: sem score_id
            addTranscription({
              id: jobId,
              ...job.result,
              createdAt: new Date().toISOString()
            })
          }

          isProcessing.value = false
          console.log(' Job concluído com sucesso!')
          return job
        } else if (job.status === "error") {
          throw new Error(job.error || "Erro no processamento")
        }

        attempts++
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (err) {
        console.error(" Erro no polling:", err)

        // Se for erro de rede que pode ser retentado, continua
        if (err.isRetryable || err.message.includes('conexão') || err.message.includes('network')) {
          console.warn(' Erro de rede, tentando novamente em 2 segundos...')
          await new Promise(resolve => setTimeout(resolve, 2000))
          continue
        }

        // Erros reais interrompem o processamento
        error.value = err.message
        isProcessing.value = false
        throw err
      }
    }
  }

  function addTranscription(transcription) {
    transcriptions.value.unshift(transcription)

    // Limitar histórico
    if (transcriptions.value.length > 50) {
      transcriptions.value = transcriptions.value.slice(0, 50)
    }

    console.log("✅ Transcrição adicionada:", transcription.id)
  }

  function getTranscription(id) {
    return transcriptions.value.find(t => t.id === id)
  }

  function deleteTranscription(id) {
    const index = transcriptions.value.findIndex(t => t.id === id)
    if (index > -1) {
      transcriptions.value.splice(index, 1)
      console.log("🗑️ Transcrição deletada:", id)
    }
  }

  function clearTranscriptions() {
    transcriptions.value = []
    console.log("🧹 Histórico de transcrições limpo")
  }

  function reset() {
    currentJob.value = null
    progress.value = 0
    error.value = null
    isProcessing.value = false
  }

  function cancelCurrentJob() {
    if (currentJob.value) {
      console.log("🚫 Cancelando job:", currentJob.value.job_id)
      currentJob.value = null
      isProcessing.value = false
      progress.value = 0
    }
  }

  // Exportar dados
  function exportTranscriptions() {
    return {
      transcriptions: transcriptions.value,
      currentJob: currentJob.value,
      exportDate: new Date().toISOString()
    }
  }

  // Funções auxiliares para análise musical
  function calculateRange(words) {
    const notesWithPitch = words
      .filter(w => w.note)
      .map(w => w.note)

    if (notesWithPitch.length === 0) return null

    const noteNumbers = notesWithPitch.map(note => {
      const noteName = note.replace(/[0-9]/g, '')
      const octave = parseInt(note.match(/[0-9]/) || '4')
      const noteMap = { 'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11 }
      return noteMap[noteName] + (octave * 12)
    })

    const minNote = Math.min(...noteNumbers)
    const maxNote = Math.max(...noteNumbers)

    return {
      lowest: notesWithPitch[noteNumbers.indexOf(minNote)],
      highest: notesWithPitch[noteNumbers.indexOf(maxNote)],
      span: maxNote - minNote
    }
  }

  function extractKey(words) {
    const notesWithPitch = words
      .filter(w => w.note)
      .map(w => w.note.replace(/[0-9]/g, ''))

    if (notesWithPitch.length === 0) return null

    const noteCount = {}
    notesWithPitch.forEach(note => {
      noteCount[note] = (noteCount[note] || 0) + 1
    })

    const sortedNotes = Object.entries(noteCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([note]) => note)

    // Simplificado: retornar a nota mais comum como tom
    return sortedNotes[0] || null
  }

  function estimateTempo(words) {
    if (words.length < 2) return null

    const durations = []
    for (let i = 1; i < words.length; i++) {
      const prevWord = words[i - 1]
      const currWord = words[i]

      if (prevWord.end && currWord.start) {
        const duration = currWord.start - prevWord.end
        if (duration > 0 && duration < 2) { // Entre 0.5s e 2s por palavra
          durations.push(duration)
        }
      }
    }

    if (durations.length === 0) return null

    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length
    const estimatedBPM = Math.round(60 / avgDuration)

    return Math.max(60, Math.min(200, estimatedBPM)) // Limitar entre 60-200 BPM
  }

  return {
    // Estado
    currentJob,
    transcriptions,
    isProcessing,
    progress,
    error,

    // Getters
    hasActiveJob,
    jobStatus,
    latestTranscription,

    // Actions
    transcribeAudioFile,
    transcribeAudioUrl,
    pollJob,
    addTranscription,
    getTranscription,
    deleteTranscription,
    clearTranscriptions,
    reset,
    cancelCurrentJob,
    exportTranscriptions
  }
})
