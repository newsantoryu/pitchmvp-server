import { ref } from "vue"
import { freqToNoteSimple, freqToNoteDetailed, isFrequencyInRange } from "../utils/noteUtils.js"

/**
 * Hook para detecção de pitch em tempo real
 * Usa Essentia.js para análise de áudio
 */
export function usePitch() {
  const currentPitch = ref(0)
  const currentNote = ref('-')
  const currentFrequency = ref('0.00 Hz')
  const isDetecting = ref(false)
  const confidence = ref(0)
  const audioContext = ref(null)
  const essentia = ref(null)
  const essentiaLoaded = ref(false)

  // Ranges por gênero vocal (migrado do backend)
  const voiceRanges = {
    male: { fmin: 75, fmax: 900 },
    female: { fmin: 120, fmax: 900 },
    auto: { fmin: 60, fmax: 900 }
  }

  /**
   * Inicializa o Essentia.js
   * @returns {Promise<boolean>} - True se inicializado com sucesso
   */
  async function init() {
    try {
      if (essentiaLoaded.value) return true

      // Carrega Essentia.js se não estiver disponível
      if (!window.Essentia) {
        await loadEssentiaScript()
      }

      // Inicializa o contexto de áudio
      audioContext.value = new (window.AudioContext || window.webkitAudioContext)()
      
      // Inicializa Essentia WASM
      essentia.value = new window.Essentia.EssentiaWASM()
      await essentia.value.ready
      
      essentiaLoaded.value = true
      console.log('🎵 Essentia.js inicializado com sucesso')
      return true

    } catch (error) {
      console.error('❌ Erro ao inicializar Essentia.js:', error)
      return false
    }
  }

  /**
   * Carrega o script do Essentia.js
   * @returns {Promise<void>}
   */
  function loadEssentiaScript() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/essentia.js@0.1.3/dist/essentia-wasm.min.js'
      script.async = true
      script.onload = resolve
      script.onerror = reject
      document.head.appendChild(script)
    })
  }

  /**
   * Detecta pitch de um buffer de áudio
   * @param {Float32Array} audioBuffer - Buffer de áudio
   * @param {number} sampleRate - Taxa de amostragem
   * @param {string} voiceGender - Gênero vocal
   * @returns {Object} - Resultado da detecção
   */
  async function detectPitch(audioBuffer, sampleRate, voiceGender = 'auto') {
    if (!essentia.value || !essentiaLoaded.value) {
      console.warn('⚠️ Essentia.js não inicializado')
      return { frequency: 0, note: '-', confidence: 0 }
    }

    try {
      // Obtém range do gênero
      const range = voiceRanges[voiceGender] || voiceRanges.auto

      // Usa PitchYin do Essentia
      const result = essentia.value.PitchYin(audioBuffer, sampleRate, {
        frameSize: 1024,
        hopSize: 512,
        lowFrequencyBound: range.fmin,
        highFrequencyBound: range.fmax,
        tolerance: 0.15,
        sampleRate: sampleRate
      })

      const frequency = result.pitch
      const conf = result.pitchConfidence || 0

      // Valida a frequência
      if (!isFrequencyInRange(frequency, range.fmin, range.fmax)) {
        return { frequency: 0, note: '-', confidence: 0 }
      }

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
    if (!essentiaLoaded.value) {
      const initialized = await init()
      if (!initialized) return
    }

    try {
      // Cria analyzer do stream
      const source = audioContext.value.createMediaStreamSource(stream)
      const analyzer = audioContext.value.createAnalyser()
      analyzer.fftSize = 2048
      analyzer.smoothingTimeConstant = 0.8
      
      source.connect(analyzer)

      isDetecting.value = true

      // Loop de detecção
      const detectLoop = async () => {
        if (!isDetecting.value) return

        try {
          // Obtém dados do áudio
          const bufferLength = analyzer.fftSize
          const buffer = new Float32Array(bufferLength)
          analyzer.getFloatTimeDomainData(buffer)

          // Detecta pitch
          const result = await detectPitch(buffer, audioContext.value.sampleRate, voiceGender)
          
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
      console.log('🎯 Detecção de pitch iniciada')

    } catch (error) {
      console.error('❌ Erro ao iniciar detecção:', error)
      isDetecting.value = false
    }
  }

  /**
   * Para a detecção de pitch
   */
  function stopDetection() {
    isDetecting.value = false
    currentPitch.value = 0
    currentNote.value = '-'
    currentFrequency.value = '0.00 Hz'
    confidence.value = 0
    console.log('⏹️ Detecção de pitch parada')
  }

  /**
   * Detecta pitch de um único frame (para API realtime)
   * @param {Array<number>} samples - Amostras de áudio
   * @param {number} sampleRate - Taxa de amostragem
   * @param {string} voiceGender - Gênero vocal
   * @returns {Promise<Object>} - Resultado da detecção
   */
  async function detectFrame(samples, sampleRate, voiceGender = 'auto') {
    if (!essentiaLoaded.value) {
      await init()
    }

    const audioBuffer = new Float32Array(samples)
    return await detectPitch(audioBuffer, sampleRate, voiceGender)
  }

  /**
   * Limpa recursos
   */
  function cleanup() {
    stopDetection()
    
    if (audioContext.value && audioContext.value.state !== 'closed') {
      audioContext.value.close()
      audioContext.value = null
    }
    
    essentia.value = null
    essentiaLoaded.value = false
  }

  return {
    // Estado
    currentPitch,
    currentNote,
    currentFrequency,
    isDetecting,
    confidence,
    essentiaLoaded,
    
    // Métodos
    init,
    detectPitch,
    startDetection,
    stopDetection,
    detectFrame,
    cleanup
  }
}
