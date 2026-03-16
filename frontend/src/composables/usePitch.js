import { ref } from "vue"

export function usePitch() {
  const currentPitch = ref(0)
  const currentNote = ref('-')
  const isDetecting = ref(false)
  const audioContext = ref(null)
  const analyzer = ref(null)
  const essentia = ref(null)

  async function init() {
    try {
      // Carrega Essentia.js
      if (!window.Essentia) {
        const script = document.createElement('script')
        script.src = 'https://cdn.jsdelivr.net/npm/essentia.js@0.1.3/dist/essentia-wasm.min.js'
        script.async = true
        document.head.appendChild(script)
        
        // Aguarda carregar
        await new Promise(resolve => {
          script.onload = resolve
        })
      }
      
      // Inicializa áudio
      audioContext.value = new (window.AudioContext || window.webkitAudioContext)()
      analyzer.value = audioContext.value.createAnalyser()
      analyzer.value.fftSize = 2048
      
      essentia.value = new window.Essentia.EssentiaWASM()
      await essentia.value.ready
      
      console.log('🎵 Essentia.js inicializado')
      return true
    } catch (error) {
      console.error('❌ Erro ao inicializar pitch detection:', error)
      return false
    }
  }

  function frequencyToNote(frequency) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    const a4 = 440
    const semitones = 12 * Math.log2(frequency / a4)
    const noteIndex = Math.round(semitones + 9) % 12
    return noteNames[noteIndex >= 0 ? noteIndex : noteIndex + 12]
  }

  async function detectPitch() {
    if (!analyzer.value || !essentia.value) return 0
    
    try {
      const dataArray = new Float32Array(analyzer.value.frequencyBinCount)
      analyzer.value.getFloatFrequencyData(dataArray)
      
      // Converte para domínio do tempo
      const timeData = new Float32Array(analyzer.value.fftSize)
      analyzer.value.getFloatTimeDomainData(timeData)
      
      // Usa Essentia para detectar pitch
      const pitch = essentia.value.PitchYin(timeData, 44100).pitch
      currentPitch.value = pitch
      
      if (pitch > 0) {
        currentNote.value = frequencyToNote(pitch)
      } else {
        currentNote.value = '-'
      }
      
      return pitch
    } catch (error) {
      console.error('❌ Erro na detecção de pitch:', error)
      return 0
    }
  }

  async function startDetection(stream) {
    if (!audioContext.value) {
      const initialized = await init()
      if (!initialized) return
    }
    
    try {
      const source = audioContext.value.createMediaStreamSource(stream)
      source.connect(analyzer.value)
      
      isDetecting.value = true
      
      // Loop de detecção
      const detectLoop = async () => {
        if (isDetecting.value) {
          await detectPitch()
          requestAnimationFrame(detectLoop)
        }
      }
      
      detectLoop()
      
      console.log('🎯 Detecção de pitch iniciada')
    } catch (error) {
      console.error('❌ Erro ao iniciar detecção:', error)
    }
  }

  function stopDetection() {
    isDetecting.value = false
    currentPitch.value = 0
    currentNote.value = '-'
    console.log('⏹️ Detecção de pitch parada')
  }

  return {
    currentPitch,
    currentNote,
    isDetecting,
    init,
    detectPitch,
    startDetection,
    stopDetection
  }
}
