/**
 * Serviço de detecção de pitch e análise musical
 */
export class PitchService {
  constructor() {
    this.essentia = null;
    this.isReady = false;
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
    } catch (error) {
      console.error('Failed to initialize Essentia:', error);
      throw new Error('Falha ao inicializar motor de pitch detection');
    }
  }

  /**
   * Processa áudio para detectar pitch
   */
  detectPitch(audioBuffer, sampleRate) {
    if (!this.essentia || !this.isReady) {
      throw new Error('Motor de pitch não inicializado');
    }

    try {
      // Limita drasticamente o tamanho do buffer para evitar erros
      const bufferSize = Math.min(audioBuffer.length, 512);
      const processBuffer = new Float32Array(bufferSize);

      for (let i = 0; i < bufferSize; i++) {
        processBuffer[i] = audioBuffer[i];
      }

      const pitchData = this.essentia.PitchYin(processBuffer, sampleRate);
      return pitchData.pitch;
    } catch (error) {
      console.error('Error detecting pitch:', error);
      return 0;
    }
  }

  /**
   * Converte frequência para nota musical
   */
  freqToNote(freq) {
    if (freq <= 0) return '-';

    const midi = Math.round(12 * Math.log2(freq / 440) + 69);
    const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const note = NOTE_NAMES[midi % 12];
    const octave = Math.floor(midi / 12) - 1;

    return note + octave;
  }

  /**
   * Converte nota para MIDI number
   */
  noteToMidi(note) {
    if (!note) return null;

    const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const match = note.match(/^([A-G]#?)(-?\d+)$/);

    if (!match) return null;

    const noteName = match[1];
    const octave = parseInt(match[2]);
    const noteIndex = NOTE_NAMES.indexOf(noteName);

    return noteIndex < 0 ? null : (octave + 1) * 12 + noteIndex;
  }

  /**
   * Converte MIDI number para nota
   */
  midiToNote(midi) {
    const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
  }

  /**
   * Calcula diferença em cents entre frequências
   */
  calculateCents(frequency, targetFrequency) {
    if (frequency <= 0 || targetFrequency <= 0) return 0;

    const midiFreq = 12 * Math.log2(frequency / 440) + 69;
    const midiTarget = 12 * Math.log2(targetFrequency / 440) + 69;

    return Math.round((midiFreq - midiTarget) * 100);
  }

  /**
   * Compara notas e determina precisão
   */
  compareNotes(sungNote, targetNote) {
    const sungMidi = this.noteToMidi(sungNote);
    const targetMidi = this.noteToMidi(targetNote);

    if (!sungMidi || !targetMidi) return 'wrong';

    const diff = Math.abs(sungMidi - targetMidi);

    if (diff <= 1) return 'correct';
    if (diff <= 3) return 'close';
    return 'wrong';
  }

  /**
   * Calcula cor baseada na dificuldade da nota
   */
  getDifficultyColor(midi, lowestMidi, highestMidi) {
    const range = highestMidi - lowestMidi;

    if (midi >= lowestMidi + range * 0.82) return '#A32D2D'; // Difícil - vermelho
    if (midi >= lowestMidi + range * 0.6) return '#BA7517';  // Médio - laranja
    return '#3B6D11'; // Confortável - verde
  }

  /**
   * Analisa range vocal de um conjunto de notas
   */
  analyzeVocalRange(notes) {
    if (!notes || notes.length === 0) {
      return {
        lowest: null,
        highest: null,
        range: 0,
        comfortableLow: null,
        comfortableHigh: null
      };
    }

    const midiNotes = notes
      .map(note => this.noteToMidi(note))
      .filter(midi => midi !== null)
      .sort((a, b) => a - b);

    if (midiNotes.length === 0) {
      return {
        lowest: null,
        highest: null,
        range: 0,
        comfortableLow: null,
        comfortableHigh: null
      };
    }

    const lowest = midiNotes[0];
    const highest = midiNotes[midiNotes.length - 1];
    const range = highest - lowest;

    // Tessitura (80% central das notas)
    const p20Index = Math.floor(midiNotes.length * 0.2);
    const p80Index = Math.floor(midiNotes.length * 0.8);
    const comfortableLow = midiNotes[p20Index];
    const comfortableHigh = midiNotes[p80Index];

    return {
      lowest: this.midiToNote(lowest),
      highest: this.midiToNote(highest),
      range,
      comfortableLow: this.midiToNote(comfortableLow),
      comfortableHigh: this.midiToNote(comfortableHigh)
    };
  }

  /**
   * Verifica se o motor está pronto
   */
  ready() {
    return this.isReady;
  }
}

export const pitchService = new PitchService();
