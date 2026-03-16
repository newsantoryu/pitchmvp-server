/**
 * Serviço de detecção de pitch em tempo real - Versão Corrigida
 */
class RealtimePitchService {
  constructor() {
    this.audioContext = null;
    this.micSource = null;
    this.processor = null;
    this.essentia = null;
    this.isReady = false;
    this.isActive = false;
    this.backendUrl = '';
    this.realtimeNotes = [];
    this.onPitchDetected = null;
    this.onRangeUpdate = null;
    this.backendInterval = null;
    
    // Canvas para visualização
    this.canvasLocal = null;
    this.canvasRemote = null;
    this.canvasCtxLocal = null;
    this.canvasCtxRemote = null;
    this.pitchHistoryLocal = [];
    this.pitchHistoryRemote = [];
    this.pitchHistoryHybridLocal = [];
    this.pitchHistoryHybridBackend = [];
    this.maxHistoryPoints = 100;
    this.lastLocalPitch = null;
    this.lastBackendPitch = null;
  }

  async initPitchEngine() {
    try {
      console.log('Inicializando motor de pitch...');
      
      if (typeof EssentiaWASM === 'undefined' || typeof Essentia === 'undefined') {
        throw new Error('Essentia.js não está carregado');
      }
      
      const wasmModule = await EssentiaWASM();
      this.essentia = new Essentia(wasmModule);
      
      this.isReady = true;
      console.log('Pitch engine initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize pitch engine:', error);
      throw error;
    }
  }

  async startRealtimeDetectionLocal() {
    if (this.isActive) return;
    
    if (!this.isReady) {
      console.log('Inicializando motor de pitch local...');
      await this.initPitchEngine();
    }
    
    try {
      this.audioContext = new AudioContext();
      
      console.log('Solicitando permissão de microfone...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microfone liberado');
      
      this.micSource = this.audioContext.createMediaStreamSource(stream);
      this.processor = this.audioContext.createScriptProcessor(2048, 1, 1);
      
      this.processor.onaudioprocess = (e) => this.processAudioLocal(e);
      
      this.micSource.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      
      this.isActive = true;
      this.initializeCanvasLocal();
      
      console.log('Realtime pitch detection LOCAL started');
      return true;
      
    } catch (error) {
      console.error('Failed to start realtime detection LOCAL:', error);
      throw new Error('Falha ao iniciar detecção de pitch em tempo real LOCAL');
    }
  }

  async startRealtimeDetectionRemote(backendUrl = '') {
    if (this.isActive) return;
    
    if (!this.isReady) {
      console.log('Inicializando motor de pitch remoto...');
      await this.initPitchEngine();
    }
    
    this.backendUrl = backendUrl;
    console.log('URL do backend definida:', backendUrl);
    
    try {
      this.audioContext = new AudioContext();
      
      console.log('Solicitando permissão de microfone...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microfone liberado');
      
      this.micSource = this.audioContext.createMediaStreamSource(stream);
      this.processor = this.audioContext.createScriptProcessor(2048, 1, 1);
      
      this.processor.onaudioprocess = (e) => this.processAudioRemote(e);
      
      this.micSource.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      
      this.isActive = true;
      this.initializeCanvasRemote();
      
      if (this.backendUrl) {
        this.startBackendProcessing();
      }
      
      console.log('Realtime pitch detection REMOTE started');
      return true;
      
    } catch (error) {
      console.error('Failed to start realtime detection REMOTE:', error);
      throw new Error('Falha ao iniciar detecção de pitch em tempo real REMOTO');
    }
  }

  startBackendProcessing() {
    if (!this.backendUrl) return;
    
    this.backendInterval = setInterval(() => {
      if (this.realtimeNotes.length > 0) {
        this.sendToBackend();
      }
    }, 5000);
    
    console.log('Backend processing started (5 segundos interval)');
  }

  async sendToBackend() {
    if (!this.backendUrl) return;

    try {
      const audioSamples = new Float32Array(2048).fill(0);
      
      const response = await fetch(`${this.backendUrl}/pitch-realtime/transcribe-frame-json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          samples: Array.from(audioSamples),
          sample_rate: this.audioContext.sampleRate
        })
      });

      if (response.ok) {
        const analysis = await response.json();
        this.updateBackendAnalysis(analysis);
        console.log('Backend analysis:', analysis);
      }

    } catch (error) {
      console.error('Error sending to backend:', error);
    }
  }

  updateBackendAnalysis(analysis) {
    this.lastBackendPitch = analysis;
    
    window.dispatchEvent(new CustomEvent('backendPitchAnalysis', {
      detail: analysis
    }));

    // Atualiza UI remota
    const backendNoteElement = document.getElementById('currentNoteRemote');
    const backendFreqElement = document.getElementById('currentFreqRemote');
    const backendAccuracyElement = document.getElementById('backendAccuracy');

    if (backendNoteElement && analysis.note) {
      backendNoteElement.textContent = analysis.note;
    }
    if (backendFreqElement && analysis.freq) {
      backendFreqElement.textContent = analysis.freq.toFixed(2) + ' Hz';
    }
    if (backendAccuracyElement && analysis.cents) {
      backendAccuracyElement.textContent = Math.abs(analysis.cents) + '¢';
    }

    // Atualiza UI do modo HÍBRIDO
    this.updateHybridUIBackend(analysis);
    this.updateDetailedMetrics(analysis);
    
    console.log('Backend UI updated:', analysis);
  }

  updateHybridUIBackend(analysis) {
    const backendNoteElement = document.getElementById('currentNoteHybridBackend');
    const backendFreqElement = document.getElementById('currentFreqHybridBackend');
    const precisionElement = document.getElementById('precisionHybridBackend');

    if (backendNoteElement && analysis.note) {
      backendNoteElement.textContent = analysis.note;
    }
    if (backendFreqElement && analysis.freq) {
      backendFreqElement.textContent = analysis.freq.toFixed(2) + ' Hz';
    }
    if (precisionElement && analysis.cents) {
      precisionElement.textContent = Math.abs(analysis.cents) + '¢';
    }

    this.updateHybridCanvasBackend(analysis);

    if (this.lastLocalPitch) {
      this.updateHybridComparison(this.lastLocalPitch, analysis);
    } else {
      this.updateHybridStatus();
    }
  }

  updateHybridCanvasBackend(analysis) {
    const midi = this.freqToMidi(analysis.freq);
    
    this.pitchHistoryHybridBackend.push(midi);
    if (this.pitchHistoryHybridBackend.length > this.maxHistoryPoints) {
      this.pitchHistoryHybridBackend.shift();
    }

    const canvas = document.getElementById('pitchCanvasHybridBackend');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 10; i++) {
        const y = (canvas.height / 10) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      if (this.pitchHistoryHybridBackend.length > 1) {
        ctx.strokeStyle = '#9b59b6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        for (let i = 0; i < this.pitchHistoryHybridBackend.length; i++) {
          const x = (canvas.width / this.maxHistoryPoints) * i;
          const y = canvas.height - ((this.pitchHistoryHybridBackend[i] - 40) / 60) * canvas.height;
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        
        ctx.stroke();
      }
    }
  }

  updateHybridComparison(localData, backendData) {
    const freqDiffElement = document.getElementById('freqDiff');
    const noteDiffElement = document.getElementById('noteDiff');
    const concordanceElement = document.getElementById('concordance');

    if (freqDiffElement) {
      const diff = Math.abs(localData.frequency - backendData.freq);
      freqDiffElement.textContent = diff.toFixed(2) + ' Hz';
    }

    if (noteDiffElement) {
      const noteDiff = localData.note !== backendData.note ? localData.note + ' vs ' + backendData.note : 'Igual';
      noteDiffElement.textContent = noteDiff;
    }

    if (concordanceElement) {
      const concordance = localData.note === backendData.note ? '✅ Concordante' : '⚠️ Diferente';
      concordanceElement.textContent = concordance;
    }

    this.updateHybridStatus();
  }

  updateHybridStatus() {
    const statusElement = document.getElementById('hybridStatus');
    
    if (statusElement) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString();
      
      if (this.lastBackendPitch && this.lastLocalPitch) {
        statusElement.innerHTML = `<span style="color:var(--green)">● Ativo</span> (${timeStr})`;
      } else if (this.lastLocalPitch) {
        statusElement.innerHTML = `<span style="color:var(--orange)">● Aguardando Backend...</span> (${timeStr})`;
      } else if (this.lastBackendPitch) {
        statusElement.innerHTML = `<span style="color:var(--orange)">● Aguardando Local...</span> (${timeStr})`;
      } else {
        statusElement.innerHTML = `<span style="color:var(--muted)">● Aguardando dados...</span>`;
      }
    }
  }

  updateDetailedMetrics(analysis) {
    const precisionElement = document.getElementById('precisionMetric');
    if (precisionElement) {
      const precision = analysis.cents ? Math.max(0, 100 - Math.abs(analysis.cents)) : 0;
      precisionElement.textContent = Math.round(precision) + '%';
    }

    const stabilityElement = document.getElementById('stabilityMetric');
    if (stabilityElement) {
      const stability = this.calculateStability();
      stabilityElement.textContent = Math.round(stability) + '%';
    }

    const profileElement = document.getElementById('vocalProfile');
    if (profileElement) {
      const profile = this.determineVocalProfile(analysis);
      profileElement.textContent = profile;
    }

    const rangeElement = document.getElementById('vocalRange');
    if (rangeElement) {
      const range = this.calculateVocalRange();
      rangeElement.textContent = range;
    }
  }

  calculateStability() {
    if (this.realtimeNotes.length < 10) return 0;
    
    const recentNotes = this.realtimeNotes.slice(-10);
    const mean = recentNotes.reduce((a, b) => a + b, 0) / recentNotes.length;
    const variance = recentNotes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / recentNotes.length;
    const stdDev = Math.sqrt(variance);
    
    const stability = Math.max(0, 100 - (stdDev * 2));
    return Math.min(100, stability);
  }

  determineVocalProfile(analysis) {
    if (!analysis.freq) return '-';
    
    const freq = analysis.freq;
    
    if (freq < 165) return 'Baixo';
    if (freq < 220) return 'Tenor';
    if (freq < 330) return 'Alto';
    if (freq < 440) return 'Mezzo-Soprano';
    if (freq < 660) return 'Soprano';
    return 'Soprano Agudo';
  }

  calculateVocalRange() {
    if (this.realtimeNotes.length < 5) return '-';
    
    const notes = this.realtimeNotes.slice(-50);
    const minNote = Math.min(...notes);
    const maxNote = Math.max(...notes);
    
    const minNoteName = this.midiToNote(minNote);
    const maxNoteName = this.midiToNote(maxNote);
    
    return `${minNoteName} - ${maxNoteName}`;
  }

  initializeCanvasLocal() {
    this.canvasLocal = document.getElementById('pitchCanvasLocal');
    if (this.canvasLocal) {
      this.canvasCtxLocal = this.canvasLocal.getContext('2d');
      this.canvasCtxLocal.fillStyle = '#1a1a1a';
      this.canvasCtxLocal.fillRect(0, 0, this.canvasLocal.width, this.canvasLocal.height);
      console.log('Canvas local inicializado');
    }
  }

  initializeCanvasRemote() {
    this.canvasRemote = document.getElementById('pitchCanvasRemote');
    if (this.canvasRemote) {
      this.canvasCtxRemote = this.canvasRemote.getContext('2d');
      this.canvasCtxRemote.fillStyle = '#1a1a1a';
      this.canvasCtxRemote.fillRect(0, 0, this.canvasRemote.width, this.canvasRemote.height);
      console.log('Canvas remoto inicializado');
    }
  }

  processAudioLocal(e) {
    if (!this.isReady || !this.isActive) return;

    const input = e.inputBuffer.getChannelData(0);
    
    try {
      const inputSignalVector = this.essentia.arrayToVector(input);
      const pitchData = this.essentia.PitchYin(inputSignalVector, this.audioContext.sampleRate);
      const freq = pitchData.pitch;
      
      inputSignalVector.delete();
      
      if (freq > 90 && freq < 600) {
        const midi = this.freqToMidi(freq);
        const note = this.midiToNote(midi);

        this.updateUILocal({
          note: note,
          frequency: freq,
          confidence: Math.round(pitchData.pitchConfidence * 100),
          midi: midi
        });
        
        this.updateVisualizationLocal(midi);
        this.realtimeNotes.push(midi);

        if (this.onPitchDetected) {
          this.onPitchDetected({
            note: note,
            frequency: freq,
            confidence: pitchData.pitchConfidence,
            midi: midi
          });
        }
      }
      
    } catch (error) {
      console.error('Error processing audio LOCAL:', error);
    }
  }

  processAudioRemote(e) {
    if (!this.isReady || !this.isActive) return;

    const input = e.inputBuffer.getChannelData(0);
    
    try {
      const inputSignalVector = this.essentia.arrayToVector(input);
      const pitchData = this.essentia.PitchYin(inputSignalVector, this.audioContext.sampleRate);
      const freq = pitchData.pitch;
      
      inputSignalVector.delete();
      
      if (freq > 90 && freq < 600) {
        const midi = this.freqToMidi(freq);
        const note = this.midiToNote(midi);

        const pitchDataObj = {
          note: note,
          frequency: freq,
          confidence: Math.round(pitchData.pitchConfidence * 100),
          midi: midi
        };

        this.lastLocalPitch = pitchDataObj;
        this.updateUIRemote(pitchDataObj);
        this.updateVisualizationRemote(midi);
        this.updateHybridUILocal(pitchDataObj);
        this.realtimeNotes.push(midi);

        if (this.onPitchDetected) {
          this.onPitchDetected(pitchDataObj);
        }
      }
      
    } catch (error) {
      console.error('Error processing audio REMOTE:', error);
    }
  }

  updateHybridUILocal(pitchData) {
    const noteElement = document.getElementById('currentNoteHybridLocal');
    const freqElement = document.getElementById('currentFreqHybridLocal');
    const confidenceElement = document.getElementById('confidenceHybridLocal');

    if (noteElement) noteElement.textContent = pitchData.note;
    if (freqElement) freqElement.textContent = pitchData.frequency.toFixed(2) + ' Hz';
    if (confidenceElement) confidenceElement.textContent = pitchData.confidence + '%';

    this.updateHybridCanvasLocal(pitchData.midi);

    if (this.lastBackendPitch) {
      this.updateHybridComparison(pitchData, this.lastBackendPitch);
    } else {
      this.updateHybridStatus();
    }
  }

  updateHybridCanvasLocal(midi) {
    this.pitchHistoryHybridLocal.push(midi);
    if (this.pitchHistoryHybridLocal.length > this.maxHistoryPoints) {
      this.pitchHistoryHybridLocal.shift();
    }

    const canvas = document.getElementById('pitchCanvasHybridLocal');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 10; i++) {
        const y = (canvas.height / 10) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      if (this.pitchHistoryHybridLocal.length > 1) {
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        for (let i = 0; i < this.pitchHistoryHybridLocal.length; i++) {
          const x = (canvas.width / this.maxHistoryPoints) * i;
          const y = canvas.height - ((this.pitchHistoryHybridLocal[i] - 40) / 60) * canvas.height;
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        
        ctx.stroke();
      }
    }
  }

  updateUILocal(pitchData) {
    const noteElement = document.getElementById('currentNoteLocal');
    const freqElement = document.getElementById('currentFreqLocal');
    const confidenceElement = document.getElementById('confidenceLocal');
    const notesDetectedElement = document.getElementById('notesDetectedLocal');

    if (noteElement) noteElement.textContent = pitchData.note;
    if (freqElement) freqElement.textContent = pitchData.frequency.toFixed(2) + ' Hz';
    if (confidenceElement) confidenceElement.textContent = pitchData.confidence + '%';
    if (notesDetectedElement) notesDetectedElement.textContent = this.realtimeNotes.length;
  }

  updateUIRemote(pitchData) {
    const noteElement = document.getElementById('currentNoteRemote');
    const freqElement = document.getElementById('currentFreqRemote');

    if (noteElement) noteElement.textContent = pitchData.note;
    if (freqElement) freqElement.textContent = pitchData.frequency.toFixed(2) + ' Hz';
  }

  updateVisualizationLocal(midi) {
    if (!this.canvasCtxLocal) return;

    this.pitchHistoryLocal.push(midi);
    if (this.pitchHistoryLocal.length > this.maxHistoryPoints) {
      this.pitchHistoryLocal.shift();
    }

    this.canvasCtxLocal.fillStyle = '#1a1a1a';
    this.canvasCtxLocal.fillRect(0, 0, this.canvasLocal.width, this.canvasLocal.height);

    this.canvasCtxLocal.strokeStyle = '#333';
    this.canvasCtxLocal.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const y = (this.canvasLocal.height / 10) * i;
      this.canvasCtxLocal.beginPath();
      this.canvasCtxLocal.moveTo(0, y);
      this.canvasCtxLocal.lineTo(this.canvasLocal.width, y);
      this.canvasCtxLocal.stroke();
    }

    if (this.pitchHistoryLocal.length > 1) {
      this.canvasCtxLocal.strokeStyle = '#00ff88';
      this.canvasCtxLocal.lineWidth = 2;
      this.canvasCtxLocal.beginPath();
      
      for (let i = 0; i < this.pitchHistoryLocal.length; i++) {
        const x = (this.canvasLocal.width / this.maxHistoryPoints) * i;
        const y = this.canvasLocal.height - ((this.pitchHistoryLocal[i] - 40) / 60) * this.canvasLocal.height;
        
        if (i === 0) {
          this.canvasCtxLocal.moveTo(x, y);
        } else {
          this.canvasCtxLocal.lineTo(x, y);
        }
      }
      
      this.canvasCtxLocal.stroke();
    }
  }

  updateVisualizationRemote(midi) {
    if (!this.canvasCtxRemote) return;

    this.pitchHistoryRemote.push(midi);
    if (this.pitchHistoryRemote.length > this.maxHistoryPoints) {
      this.pitchHistoryRemote.shift();
    }

    this.canvasCtxRemote.fillStyle = '#1a1a1a';
    this.canvasCtxRemote.fillRect(0, 0, this.canvasRemote.width, this.canvasRemote.height);

    this.canvasCtxRemote.strokeStyle = '#333';
    this.canvasCtxRemote.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const y = (this.canvasRemote.height / 10) * i;
      this.canvasCtxRemote.beginPath();
      this.canvasCtxRemote.moveTo(0, y);
      this.canvasCtxRemote.lineTo(this.canvasRemote.width, y);
      this.canvasCtxRemote.stroke();
    }

    if (this.pitchHistoryRemote.length > 1) {
      this.canvasCtxRemote.strokeStyle = '#ff6b6b';
      this.canvasCtxRemote.lineWidth = 2;
      this.canvasCtxRemote.beginPath();
      
      for (let i = 0; i < this.pitchHistoryRemote.length; i++) {
        const x = (this.canvasRemote.width / this.maxHistoryPoints) * i;
        const y = this.canvasRemote.height - ((this.pitchHistoryRemote[i] - 40) / 60) * this.canvasRemote.height;
        
        if (i === 0) {
          this.canvasCtxRemote.moveTo(x, y);
        } else {
          this.canvasCtxRemote.lineTo(x, y);
        }
      }
      
      this.canvasCtxRemote.stroke();
    }
  }

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

    if (this.backendInterval) {
      clearInterval(this.backendInterval);
      this.backendInterval = null;
    }

    this.isActive = false;
    console.log('Realtime pitch detection stopped');
  }

  setCallbacks(callbacks) {
    this.onPitchDetected = callbacks.onPitchDetected || null;
    this.onRangeUpdate = callbacks.onRangeUpdate || null;
  }

  freqToMidi(freq) {
    if (freq <= 0) return 0;
    return Math.round(12 * Math.log2(freq / 440) + 69);
  }

  midiToNote(midi) {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const note = notes[midi % 12];
    const octave = Math.floor(midi / 12) - 1;
    return note + octave;
  }

  cleanup() {
    this.stopRealtimeDetection();
    this.essentia = null;
    this.isReady = false;
    this.onPitchDetected = null;
    this.onRangeUpdate = null;
  }
}

export const realtimePitchService = new RealtimePitchService();
