import { ref } from "vue"
import { freqToNoteSimple, freqToNoteDetailed, isFrequencyInRange } from "../utils/noteUtils.js"

/**
 * Hook para detecção de pitch em tempo real
 * Usa Web Audio API para análise de áudio (mais confiável)
 */
export function usePitch() {
  const currentPitch = ref(0)
  const currentNote = ref('-')
  const currentFrequency = ref('0.00 Hz')
  const isDetecting = ref(false)
  const confidence = ref(0)
  const audioContext = ref(null)
  const analyzer = ref(null)
  const source = ref(null)

  // Ranges por gênero vocal
  const voiceRanges = {
    male: { fmin: 75, fmax: 900 },
    female: { fmin: 120, fmax: 900 },
    auto: { fmin: 60, fmax: 900 }
  }

  /**
   * Inicializa o sistema de áudio
   * @returns {Promise<boolean>} - True se inicializado com sucesso
   */
  async function init() {
    try {
      console.log('🔄 Inicializando Web Audio API...')

      // Inicializa o contexto de áudio
      audioContext.value = new (window.AudioContext || window.webkitAudioContext)()

      console.log('✅ Web Audio API inicializado com sucesso')
      return true

    } catch (error) {
      console.error('❌ Erro ao inicializar Web Audio API:', error)
      return false
    }
  }

  /**
   * Detecta pitch de um buffer de áudio usando autocorrelação básica
   * @param {Float32Array} audioBuffer - Buffer de áudio
   * @param {number} sampleRate - Taxa de amostragem
   * @param {string} voiceGender - Gênero vocal
   * @returns {Object} - Resultado da detecção
   */
  function detectPitchBasic(audioBuffer, sampleRate, voiceGender = 'auto') {
    try {
      // Obtém range do gênero
      const range = voiceRanges[voiceGender] || voiceRanges.auto

      // Autocorrelação básica para detecção de pitch
      const bufferSize = Math.min(audioBuffer.length, 2048)
      const buffer = audioBuffer.slice(0, bufferSize)

      // Calcula a autocorrelação
      const correlations = []
      const maxLag = Math.floor(sampleRate / range.fmin) // Máximo lag para frequência mínima
      const minLag = Math.floor(sampleRate / range.fmax) // Mínimo lag para frequência máxima

      for (let lag = minLag; lag <= maxLag; lag++) {
        let correlation = 0
        for (let i = 0; i < bufferSize - lag; i++) {
          correlation += buffer[i] * buffer[i + lag]
        }
        correlations.push(correlation)
      }

      // Encontra o pico de autocorrelação
      let maxCorrelation = 0
      let bestLag = minLag

      for (let i = 0; i < correlations.length; i++) {
        if (correlations[i] > maxCorrelation) {
          maxCorrelation = correlations[i]
          bestLag = minLag + i
        }
      }

      // Calcula a frequência
      const frequency = sampleRate / bestLag

      // Valida a frequência e confiança
      if (frequency < range.fmin || frequency > range.fmax || maxCorrelation < 0.01) {
        return { frequency: 0, note: '-', confidence: 0 }
      }

      // Normaliza confiança
      const conf = Math.min(maxCorrelation / 1000, 1.0)

      // Converte para nota
      const note = freqToNoteSimple(frequency)
      const noteDetails = freqToNoteDetailed(frequency)

      return {
        frequency: frequency,
        note: note,
        noteDetails: noteDetails,
        confidence: conf,
        sampleRate: sampleRate,
        timestamp: Date.now()
      }

    } catch (error) {
      console.error('❌ Erro na detecção de pitch:', error)
      return { frequency: 0, note: '-', confidence: 0 }
    }
  }

  /**
   * Inicia detecção contínua de pitch
   * @param {MediaStream} stream - Stream de áudio
   * @param {string} voiceGender - Gênero vocal
   * @param {Function} callback - Callback para resultados
   */
  async function startDetection(stream, voiceGender = 'auto', callback = null) {
    try {
      console.log('🎯 Iniciando detecção de pitch com Web Audio API...')

      if (!audioContext.value) {
        const initialized = await init()
        if (!initialized) {
          throw new Error('Não foi possível inicializar Web Audio API')
        }
      }

      // Cria analyzer do stream
      source.value = audioContext.value.createMediaStreamSource(stream)
      analyzer.value = audioContext.value.createAnalyser()
      analyzer.value.fftSize = 2048
      analyzer.value.smoothingTimeConstant = 0.8

      source.value.connect(analyzer.value)

      isDetecting.value = true
      console.log('✅ Stream de áudio conectado')

      // Loop de detecção
      const detectLoop = async () => {
        if (!isDetecting.value) {
          console.log('⏹️ Loop de detecção parado')
          return
        }

        try {
          // Obtém dados do áudio
          const bufferLength = analyzer.value.frequencyBinCount
          const frequencyData = new Uint8Array(bufferLength)
          analyzer.value.getByteFrequencyData(frequencyData)

          // Converte para Float32Array
          const timeData = new Float32Array(bufferLength)
          analyzer.value.getFloatTimeDomainData(timeData)

          // Detecta pitch
          const result = detectPitchBasic(timeData, audioContext.value.sampleRate, voiceGender)

          // Atualiza estado
          currentPitch.value = result.frequency
          currentNote.value = result.note
          currentFrequency.value = `${result.frequency.toFixed(2)} Hz`
          confidence.value = result.confidence

          // Callback externo
          if (callback && typeof callback === 'function') {
            callback(result)
          }

        } catch (error) {
          console.error('❌ Erro no loop de detecção:', error)
        }

        // Próxima iteração
        requestAnimationFrame(detectLoop)
      }

      detectLoop()
      console.log('✅ Detecção de pitch iniciada com sucesso')

    } catch (error) {
      console.error('❌ Erro ao iniciar detecção:', error)
      isDetecting.value = false
      throw error
    }
  }

  /**
   * Para a detecção de pitch
   */
  function stopDetection() {
    try {
      console.log('⏹️ Parando detecção de pitch...')

      isDetecting.value = false
      currentPitch.value = 0
      currentNote.value = '-'
      currentFrequency.value = '0.00 Hz'
      confidence.value = 0

      // Limpa conexões
      if (source.value) {
        try {
          source.value.disconnect()
        } catch (e) {
          // Ignora erros de disconnect
        }
        source.value = null
      }

      if (analyzer.value) {
        analyzer.value = null
      }

      console.log('✅ Detecção de pitch parada com sucesso')

    } catch (error) {
      console.error('❌ Erro ao parar detecção:', error)
    }
  }

  /**
   * Detecta pitch de um único frame (para API realtime)
   * @param {Array<number>} samples - Amostras de áudio
   * @param {number} sampleRate - Taxa de amostragem
   * @param {string} voiceGender - Gênero vocal
   * @returns {Promise<Object>} - Resultado da detecção
   */
  async function detectFrame(samples, sampleRate, voiceGender = 'auto') {
    if (!audioContext.value) {
      await init()
    }

    const audioBuffer = new Float32Array(samples)
    return detectPitchBasic(audioBuffer, sampleRate, voiceGender)
  }

  /**
   * Limpa recursos
   */
  function cleanup() {
    stopDetection()

    if (audioContext.value && audioContext.value.state !== 'closed') {
      try {
        audioContext.value.close()
      } catch (e) {
        // Ignora erros de close
      }
      audioContext.value = null
    }
  }

  return {
    // Estado
    currentPitch,
    currentNote,
    currentFrequency,
    isDetecting,
    confidence,

    // Métodos
    init,
    detectPitch: detectPitchBasic,
    startDetection,
    stopDetection,
    detectFrame,
    cleanup
  }
}
