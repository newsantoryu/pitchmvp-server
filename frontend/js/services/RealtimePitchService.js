/**
 * Serviço especializado em detecção de pitch em tempo real
 */
export class RealtimePitchService {
  constructor() {
    this.essentia = null;
    this.isReady = false;
    this.audioContext = null;
    this.micSource = null;
    this.processor = null;
    this.isActive = false;
    this.realtimeNotes = [];
    this.onPitchDetected = null;
    this.onRangeUpdate = null;
    this.lastUpdate = 0;
    this.updateInterval = 100; // Atualiza a cada 100ms
    this.voiceThreshold = 0.01; // Threshold para detecção de voz
  }

  /**
   * Inicializa o motor de pitch detection
   */
  async initPitchEngine() {
    if (this.isReady) return;

    try {
      const wasmModule = await EssentiaWASM();
      this.essentia = new Essentia(wasmModule);
      this.isReady = true;
      console.log('Pitch engine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Essentia:', error);
      throw new Error('Falha ao inicializar motor de pitch detection');
    }
  }

  /**
   * Inicia detecção de pitch em tempo real
   */
  async startRealtimeDetection() {
    if (this.isActive) return;
    
    if (!this.isReady) {
      await this.initPitchEngine();
    }

    try {
      this.audioContext = new AudioContext();
      this.realtimeNotes = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.micSource = this.audioContext.createMediaStreamSource(stream);
      // Usa buffer muito menor para evitar erros com Essentia.js
      this.processor = this.audioContext.createScriptProcessor(512, 1, 1);

      this.micSource.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      this.processor.onaudioprocess = (e) => this.processAudio(e);
      this.isActive = true;

      console.log('Realtime pitch detection started');
      return true;

    } catch (error) {
      console.error('Failed to start realtime detection:', error);
      throw new Error('Falha ao iniciar detecção de pitch em tempo real');
    }
  }

  /**
   * Para detecção de pitch em tempo real
   */
  stopRealtimeDetection() {
    if (!this.isActive) return;

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.realtimeNotes = [];
    this.isActive = false;

    console.log('Realtime pitch detection stopped');
  }

  /**
   * Processa áudio para detectar pitch
   */
  processAudio(event) {
    if (!this.essentia || !this.audioContext) return;

    const input = event.inputBuffer.getChannelData(0);
    
    // Verifica se há sinal de voz (amplitude suficiente)
    const amplitude = this.calculateAmplitude(input);
    if (amplitude < this.voiceThreshold) {
      return; // Ignora se não houver voz
    }
    
    // Limita atualizações para não mudar a view muito rápido
    const now = Date.now();
    if (now - this.lastUpdate < this.updateInterval) {
      return;
    }
    this.lastUpdate = now;
    
    // Reduz drasticamente o tamanho do buffer para evitar erro de binding
    const bufferSize = Math.min(input.length, 512);
    const audioBuffer = new Float32Array(bufferSize);
    
    // Copia apenas uma parte do buffer
    for (let i = 0; i < bufferSize; i++) {
      audioBuffer[i] = input[i];
    }

    try {
      const pitchData = this.essentia.PitchYin(audioBuffer, this.audioContext.sampleRate);
      const freq = pitchData.pitch;

      // Filtra para range vocal humano (80-800 Hz para voz)
      if (freq > 80 && freq < 800) {
        const noteData = this.analyzePitch(freq);
        
        // Validação adicional para garantir que é voz
        if (this.isHumanVoice(freq, amplitude)) {
          // Adiciona às notas em tempo real
          this.realtimeNotes.push(noteData.midi);
          if (this.realtimeNotes.length > 200) {
            this.realtimeNotes.shift();
          }

          // Dispara evento de pitch detectado
          if (this.onPitchDetected) {
            this.onPitchDetected(noteData);
          }

          // Atualiza range vocal
          this.updateRealtimeRange();
        }
      }
    } catch (error) {
      // Se Essentia falhar, tenta algoritmo simplificado
      this.processAudioFallback(audioBuffer, amplitude);
    }
  }

  /**
   * Calcula amplitude do sinal de áudio
   */
  calculateAmplitude(buffer) {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += Math.abs(buffer[i]);
    }
    return sum / buffer.length;
  }

  /**
   * Verifica se o sinal provavelmente é voz humana
   */
  isHumanVoice(frequency, amplitude) {
    // Range vocal típico: 80-800 Hz
    if (frequency < 80 || frequency > 800) {
      return false;
    }
    
    // Amplitude mínima para considerar como voz
    if (amplitude < this.voiceThreshold) {
      return false;
    }
    
    // Frequências típicas de fala/canto
    const voiceRanges = {
      male: { min: 85, max: 180 },
      female: { min: 165, max: 330 },
      child: { min: 250, max: 400 }
    };
    
    // Verifica se está em algum range vocal razoável
    for (const range of Object.values(voiceRanges)) {
      if (frequency >= range.min && frequency <= range.max) {
        return true;
      }
    }
    
    // Se não estiver em range específico, ainda pode ser voz (falsete, etc)
    return frequency <= 800;
  }

  /**
   * Fallback para detecção de pitch sem Essentia
   */
  processAudioFallback(audioBuffer, amplitude) {
    try {
      // Algoritmo simplificado de autocorrelação
      const freq = this.simplePitchDetection(audioBuffer);

      // Filtra para range vocal humano
      if (freq > 80 && freq < 800 && this.isHumanVoice(freq, amplitude)) {
        const noteData = this.analyzePitch(freq);

        // Adiciona às notas em tempo real
        this.realtimeNotes.push(noteData.midi);
        if (this.realtimeNotes.length > 200) {
          this.realtimeNotes.shift();
        }

        // Dispara evento de pitch detectado
        if (this.onPitchDetected) {
          this.onPitchDetected(noteData);
        }

        // Atualiza range vocal
        this.updateRealtimeRange();
      }
    } catch (error) {
      console.warn('Erro no fallback de pitch:', error.message);
    }
  }

  /**
   * Algoritmo simplificado de detecção de pitch
   */
  simplePitchDetection(buffer) {
    const sampleRate = this.audioContext.sampleRate;
    const minFreq = 80;
    const maxFreq = 800;
    const minPeriod = Math.floor(sampleRate / maxFreq);
    const maxPeriod = Math.floor(sampleRate / minFreq);

    // Autocorrelação simplificada
    let bestPeriod = 0;
    let bestCorrelation = 0;

    for (let period = minPeriod; period < maxPeriod; period++) {
      let correlation = 0;
      let energy = 0;

      for (let i = 0; i < buffer.length - period; i++) {
        correlation += buffer[i] * buffer[i + period];
        energy += buffer[i] * buffer[i];
      }

      if (energy > 0) {
        correlation = correlation / energy;
        if (correlation > bestCorrelation) {
          bestCorrelation = correlation;
          bestPeriod = period;
        }
      }
    }

    if (bestPeriod > 0 && bestCorrelation > 0.3) {
      return sampleRate / bestPeriod;
    }

    return 0;
  }

  /**
   * Analisa frequência e extrai informações
   */
  analyzePitch(freq) {
    const midi = Math.round(12 * Math.log2(freq / 440) + 69);
    const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const note = NOTE_NAMES[midi % 12];
    const octave = Math.floor(midi / 12) - 1;
    const noteName = note + octave;

    // Calcula cents
    const exactMidi = 12 * Math.log2(freq / 440) + 69;
    const roundedMidi = Math.round(exactMidi);
    const cents = Math.round((exactMidi - roundedMidi) * 100);

    return {
      frequency: freq,
      note: noteName,
      midi: midi,
      cents: cents,
      timestamp: Date.now()
    };
  }

  /**
   * Atualiza range vocal em tempo real
   */
  updateRealtimeRange() {
    if (this.realtimeNotes.length < 8) return;

    const sorted = [...this.realtimeNotes].sort((a, b) => a - b);
    const low = sorted[0];
    const high = sorted[sorted.length - 1];

    const rangeData = {
      lowest: this.midiToNote(low),
      highest: this.midiToNote(high),
      midiLow: low,
      midiHigh: high
    };

    if (this.onRangeUpdate) {
      this.onRangeUpdate(rangeData);
    }
  }

  /**
   * Define callbacks
   */
  setCallbacks(callbacks) {
    if (callbacks.onPitchDetected) {
      this.onPitchDetected = callbacks.onPitchDetected;
    }
    if (callbacks.onRangeUpdate) {
      this.onRangeUpdate = callbacks.onRangeUpdate;
    }
  }

  /**
   * Obtém estatísticas atuais
   */
  getCurrentStats() {
    if (this.realtimeNotes.length < 2) {
      return {
        averageFrequency: 0,
        currentNote: '-',
        noteStability: 0,
        range: { lowest: '-', highest: '-' }
      };
    }

    const sorted = [...this.realtimeNotes].sort((a, b) => a - b);
    const recentNotes = this.realtimeNotes.slice(-10); // Últimas 10 notas
    
    // Calcula estabilidade da nota (quão consistentes são as notas recentes)
    const noteFrequency = {};
    recentNotes.forEach(midi => {
      const note = this.midiToNote(midi);
      noteFrequency[note] = (noteFrequency[note] || 0) + 1;
    });
    
    const mostFrequentNote = Object.keys(noteFrequency).reduce((a, b) => 
      noteFrequency[a] > noteFrequency[b] ? a : b
    );
    
    const stability = noteFrequency[mostFrequentNote] / recentNotes.length;

    return {
      averageFrequency: this.midiToFreq(sorted[Math.floor(sorted.length / 2)]),
      currentNote: mostFrequentNote,
      noteStability: Math.round(stability * 100),
      range: {
        lowest: this.midiToNote(sorted[0]),
        highest: this.midiToNote(sorted[sorted.length - 1])
      }
    };
  }

  /**
   * Converte MIDI para nota
   */
  midiToNote(midi) {
    const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
  }

  /**
   * Converte MIDI para frequência
   */
  midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /**
   * Verifica se está ativo
   */
  isDetectionActive() {
    return this.isActive;
  }

  /**
   * Limpa recursos
   */
  cleanup() {
    this.stopRealtimeDetection();
    this.essentia = null;
    this.isReady = false;
    this.onPitchDetected = null;
    this.onRangeUpdate = null;
  }
}

// Singleton instance
export const realtimePitchService = new RealtimePitchService();
