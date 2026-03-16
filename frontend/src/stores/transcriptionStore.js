import { defineStore } from "pinia"
import { ref, computed } from "vue"
import { transcribeFile, transcribeUrl, getJobStatus } from "../services/api.js"

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
      
      console.log("📁 Enviando arquivo para transcrição:", file.name)
      
      // Enviar arquivo
      const response = await transcribeFile(file, options.voiceGender || "auto")
      currentJob.value = response
      
      // Polling do job
      await pollJob(response.job_id)
      
      return response
      
    } catch (err) {
      console.error("❌ Erro na transcrição:", err)
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
      
      // Enviar URL
      const response = await transcribeUrl(
        url, 
        options.anonKey || "", 
        options.voiceGender || "auto"
      )
      currentJob.value = response
      
      // Polling do job
      await pollJob(response.job_id)
      
      return response
      
    } catch (err) {
      console.error("❌ Erro na transcrição da URL:", err)
      error.value = err.message
      isProcessing.value = false
      throw err
    }
  }
  
  async function pollJob(jobId) {
    const maxAttempts = 120 // 2 minutos
    let attempts = 0
    
    while (attempts < maxAttempts) {
      try {
        const job = await getJobStatus(jobId)
        currentJob.value = job
        
        // Simular progresso baseado no status
        if (job.status === "queued") {
          progress.value = Math.min(10, attempts * 2)
        } else if (job.status === "processing") {
          progress.value = Math.min(90, 10 + (attempts * 3))
        } else if (job.status === "done") {
          progress.value = 100
          
          // Adicionar aos resultados
          if (job.result) {
            addTranscription({
              id: jobId,
              ...job.result,
              createdAt: new Date().toISOString()
            })
          }
          
          isProcessing.value = false
          return job
        } else if (job.status === "error") {
          throw new Error(job.error || "Erro no processamento")
        }
        
        attempts++
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (err) {
        console.error("❌ Erro no polling:", err)
        error.value = err.message
        isProcessing.value = false
        throw err
      }
    }
    
    throw new Error("Timeout ao processar transcrição")
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
    isProcessing.value = false
    progress.value = 0
    error.value = null
    clearTranscriptions()
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
    addTranscription,
    getTranscription,
    deleteTranscription,
    clearTranscriptions,
    reset,
    cancelCurrentJob,
    exportTranscriptions
  }
})
