import { ref } from "vue"

/**
 * Hook para gerenciamento de microfone e stream de áudio
 * Usa Web Audio API para análise em tempo real
 */
export function useMicrophone() {
  const stream = ref(null)
  const isRecording = ref(false)
  const audioContext = ref(null)
  const analyzer = ref(null)
  const source = ref(null)
  const isMicrophoneActive = ref(false)

  /**
   * Inicia o stream do microfone
   * @param {Object} constraints - Restrições de áudio
   * @returns {Promise<MediaStream>} - Stream de áudio
   */
  async function start(constraints = {}) {
    try {
      // Solicita permissão do microfone
      const audioConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 44100,
        ...constraints
      }

      stream.value = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints
      })

      // Inicia Web Audio API se não estiver ativo
      if (!audioContext.value) {
        audioContext.value = new (window.AudioContext || window.webkitAudioContext)()
        analyzer.value = audioContext.value.createAnalyser()
        analyzer.value.fftSize = 2048
        analyzer.value.smoothingTimeConstant = 0.8
      }

      // Conecta o stream ao analyzer
      source.value = audioContext.value.createMediaStreamSource(stream.value)
      source.value.connect(analyzer.value)

      isMicrophoneActive.value = true
      isRecording.value = true

      console.log('🎤 Microfone iniciado com Web Audio API')
      return stream.value

    } catch (error) {
      console.error('❌ Erro ao acessar microfone:', error)
      throw error
    }
  }

  /**
   * Para o stream do microfone
   */
  function stop() {
    // Para todas as tracks do stream
    if (stream.value) {
      stream.value.getTracks().forEach(track => {
        track.stop()
      })
      stream.value = null
    }

    // Desconecta o source
    if (source.value) {
      source.value.disconnect()
      source.value = null
    }

    // Fecha o audio context se não estiver mais sendo usado
    if (audioContext.value && audioContext.value.state !== 'closed') {
      audioContext.value.close()
      audioContext.value = null
    }

    analyzer.value = null
    isMicrophoneActive.value = false
    isRecording.value = false

    console.log('⏹️ Microfone parado')
  }

  /**
   * Obtém dados do áudio em tempo real
   * @returns {Object} - Dados do áudio (frequência, tempo, etc)
   */
  function getAudioData() {
    if (!analyzer.value || !isMicrophoneActive.value) {
      return null
    }

    const bufferLength = analyzer.value.frequencyBinCount
    const dataArray = new Float32Array(bufferLength)
    analyzer.value.getFloatFrequencyData(dataArray)

    // Encontra a frequência dominante
    let maxValue = 0
    let maxIndex = 0

    for (let i = 0; i < bufferLength; i++) {
      if (dataArray[i] > maxValue) {
        maxValue = dataArray[i]
        maxIndex = i
      }
    }

    // Converte para frequência em Hz
    const nyquist = audioContext.value.sampleRate / 2
    const frequency = maxIndex * nyquist / bufferLength

    // Obtém dados do tempo (waveform)
    const timeData = new Float32Array(bufferLength)
    analyzer.value.getFloatTimeDomainData(timeData)

    // Calcula RMS (volume)
    let sum = 0
    for (let i = 0; i < timeData.length; i++) {
      sum += timeData[i] * timeData[i]
    }
    const rms = Math.sqrt(sum / timeData.length)

    return {
      frequency: frequency,
      amplitude: maxValue,
      rms: rms,
      sampleRate: audioContext.value.sampleRate,
      timestamp: Date.now()
    }
  }

  /**
   * Verifica se o microfone está disponível
   * @returns {Promise<boolean>} - True se disponível
   */
  async function isAvailable() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      return devices.some(device => device.kind === 'audioinput')
    } catch (error) {
      console.error('Erro ao verificar dispositivos:', error)
      return false
    }
  }

  /**
   * Obtém o nível de volume atual
   * @returns {number} - Volume de 0 a 1
   */
  function getVolumeLevel() {
    const audioData = getAudioData()
    return audioData ? Math.min(audioData.rms * 10, 1) : 0
  }

  /**
   * Limpa recursos
   */
  function cleanup() {
    stop()
  }

  return {
    // Estado
    stream,
    isRecording,
    isMicrophoneActive,
    audioContext,
    analyzer,

    // Métodos
    start,
    stop,
    getAudioData,
    getVolumeLevel,
    isAvailable,
    cleanup
  }
}
