import { ref } from "vue"

/**
 * Hook para gravação de áudio usando MediaRecorder API
 * Alternativa ao getUserMedia para gravação completa
 */
export function useRecorder() {
  const mediaRecorder = ref(null)
  const isRecording = ref(false)
  const audioChunks = ref([])
  const audioBlob = ref(null)
  const audioUrl = ref(null)
  const recordingTime = ref(0)
  const timer = ref(null)

  /**
   * Inicia a gravação de áudio
   * @param {Object} options - Opções de gravação
   * @returns {Promise<MediaStream>} - Stream de áudio
   */
  async function startRecording(options = {}) {
    try {
      // Solicita permissão do microfone
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: options.sampleRate || 44100
        } 
      })

      // Cria MediaRecorder com o stream
      const recorder = new MediaRecorder(stream, {
        mimeType: options.mimeType || 'audio/webm;codecs=opus'
      })

      mediaRecorder.value = recorder
      audioChunks.value = []
      audioBlob.value = null
      audioUrl.value = null

      // Event handlers
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.value.push(event.data)
        }
      }

      recorder.onstop = () => {
        // Cria blob com os chunks
        const blob = new Blob(audioChunks.value, { 
          type: options.mimeType || 'audio/webm;codecs=opus' 
        })
        
        audioBlob.value = blob
        audioUrl.value = URL.createObjectURL(blob)
        
        // Para todas as tracks do stream
        stream.getTracks().forEach(track => track.stop())
      }

      recorder.onerror = (event) => {
        console.error('Erro na gravação:', event.error)
        stopRecording()
      }

      // Inicia a gravação
      recorder.start(options.timeSlice || 100) // 100ms chunks
      isRecording.value = true

      // Inicia timer
      startTimer()

      console.log('🎤 Gravação iniciada com MediaRecorder')
      return stream

    } catch (error) {
      console.error('❌ Erro ao iniciar gravação:', error)
      throw error
    }
  }

  /**
   * Para a gravação atual
   */
  function stopRecording() {
    if (mediaRecorder.value && isRecording.value) {
      mediaRecorder.value.stop()
      isRecording.value = false
      stopTimer()
      console.log('⏹️ Gravação parada')
    }
  }

  /**
   * Cancela a gravação sem salvar
   */
  function cancelRecording() {
    if (mediaRecorder.value && isRecording.value) {
      mediaRecorder.value.stop()
      isRecording.value = false
      stopTimer()
      
      // Limpa dados
      audioChunks.value = []
      audioBlob.value = null
      if (audioUrl.value) {
        URL.revokeObjectURL(audioUrl.value)
        audioUrl.value = null
      }
      
      console.log('🚫 Gravação cancelada')
    }
  }

  /**
   * Inicia o timer de gravação
   */
  function startTimer() {
    recordingTime.value = 0
    timer.value = setInterval(() => {
      recordingTime.value++
    }, 1000)
  }

  /**
   * Para o timer de gravação
   */
  function stopTimer() {
    if (timer.value) {
      clearInterval(timer.value)
      timer.value = null
    }
    recordingTime.value = 0
  }

  /**
   * Formata o tempo de gravação
   * @returns {string} - Tempo formatado (MM:SS)
   */
  function formatTime() {
    const minutes = Math.floor(recordingTime.value / 60)
    const seconds = recordingTime.value % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  /**
   * Obtém o áudio como File para upload
   * @param {string} filename - Nome do arquivo
   * @returns {File} - Arquivo de áudio
   */
  function getAudioFile(filename = 'recording.webm') {
    if (!audioBlob.value) return null
    
    return new File([audioBlob.value], filename, {
      type: audioBlob.value.type
    })
  }

  /**
   * Limpa recursos
   */
  function cleanup() {
    cancelRecording()
    if (audioUrl.value) {
      URL.revokeObjectURL(audioUrl.value)
      audioUrl.value = null
    }
  }

  return {
    // Estado
    isRecording,
    audioBlob,
    audioUrl,
    recordingTime,
    
    // Métodos
    startRecording,
    stopRecording,
    cancelRecording,
    formatTime,
    getAudioFile,
    cleanup
  }
}
