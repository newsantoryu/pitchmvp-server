class RealtimePitch {
  constructor(container) {
    this.container = container;
    this.essentia = null;
    this.pitchReady = false;
    this.audioContext = null;
    this.micSource = null;
    this.processor = null;
    this.realtimeNotes = [];
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div id="realtime" class="tab-content">
        <h1>Pitch Realtime</h1>
        <div>
          <button id="startRealtimeBtn">Start</button>
          <button id="stopRealtimeBtn">Stop</button>
        </div>
        <div id="pitch-display">
          <p>Nota: <span id="note">-</span></p>
          <p>Frequência: <span id="freq">0.00</span> Hz</p>
          <p>Cents: <span id="cents">0</span></p>
        </div>
        <div id="voiceRange"></div>
      </div>
    `;
    this.bindEvents();
  }

  bindEvents() {
    const startBtn = document.getElementById('startRealtimeBtn');
    const stopBtn = document.getElementById('stopRealtimeBtn');

    if (startBtn) {
      startBtn.addEventListener('click', () => this.startRealtime());
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', () => this.stopRealtime());
    }
  }

  async initPitchEngine() {
    if (this.pitchReady) return;

    try {
      const wasmModule = await EssentiaWASM();
      this.essentia = new Essentia(wasmModule);
      this.pitchReady = true;
    } catch (error) {
      console.error('Failed to initialize Essentia:', error);
      throw error;
    }
  }

  async startRealtime() {
    try {
      await this.initPitchEngine();
      
      this.audioContext = new AudioContext();
      this.realtimeNotes = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.micSource = this.audioContext.createMediaStreamSource(stream);
      this.processor = this.audioContext.createScriptProcessor(2048, 1, 1);

      this.micSource.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      this.processor.onaudioprocess = (e) => this.processAudio(e);

      this.updateStatus('running');
      
    } catch (error) {
      console.error('Failed to start realtime pitch detection:', error);
      this.updateStatus('error');
    }
  }

  processAudio(event) {
    if (!this.essentia || !this.audioContext) return;

    const input = event.inputBuffer.getChannelData(0);
    const pitchData = this.essentia.PitchYin(input, this.audioContext.sampleRate);
    const freq = pitchData.pitch;

    if (freq > 90 && freq < 600) {
      const note = this.freqToNote(freq);
      const midi = this.noteToMidi(note);

      this.realtimeNotes.push(midi);
      if (this.realtimeNotes.length > 200) {
        this.realtimeNotes.shift();
      }

      this.updatePitchDisplay(note, freq);
      this.updateRealtimeRange();

      // Compare with singing score if available
      if (typeof window.comparePitch === 'function') {
        window.comparePitch(note);
      }
    }
  }

  stopRealtime() {
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
    this.updateStatus('stopped');
    this.updatePitchDisplay('-', 0);
  }

  updatePitchDisplay(note, frequency) {
    const noteElement = document.getElementById('note');
    const freqElement = document.getElementById('freq');
    const centsElement = document.getElementById('cents');

    if (noteElement) noteElement.textContent = note;
    if (freqElement) freqElement.textContent = frequency.toFixed(2);

    // Calculate cents deviation from perfect pitch
    if (frequency > 0) {
      const midi = 12 * Math.log2(frequency / 440) + 69;
      const roundedMidi = Math.round(midi);
      const cents = Math.round((midi - roundedMidi) * 100);
      if (centsElement) centsElement.textContent = cents;
    } else {
      if (centsElement) centsElement.textContent = '0';
    }
  }

  updateRealtimeRange() {
    if (this.realtimeNotes.length < 8) return;

    const sorted = [...this.realtimeNotes].sort((a, b) => a - b);
    const low = sorted[0];
    const high = sorted[sorted.length - 1];

    const rangeElement = document.getElementById('voiceRange');
    if (rangeElement) {
      rangeElement.innerText = `Vocal range atual: ${this.midiToNote(low)} – ${this.midiToNote(high)}`;
    }
  }

  updateStatus(status) {
    // Could add visual indicators for status
    console.log('Realtime pitch status:', status);
  }

  // Utility functions
  freqToNote(freq) {
    const midi = Math.round(12 * Math.log2(freq / 440) + 69);
    const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const note = NOTE_NAMES[midi % 12];
    const octave = Math.floor(midi / 12) - 1;
    return note + octave;
  }

  noteToMidi(note) {
    const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const name = note.slice(0, -1);
    const octave = parseInt(note.slice(-1));
    return NOTE_NAMES.indexOf(name) + (octave + 1) * 12;
  }

  midiToNote(midi) {
    const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
  }
}

window.RealtimePitch = RealtimePitch;
