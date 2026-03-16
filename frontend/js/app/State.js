/**
 * Gerenciamento de estado global da aplicação
 */
export class State {
  constructor() {
    this.tab = 'upload';
    this.selectedFile = null;
    this.recorder = null;
    this.recChunks = [];
    this.recTimer = null;
    this.recSecs = 0;
    this.analyzerNode = null;
    this.animationFrame = null;
    this.resultData = null;
    this.pollTimer = null;
    this.voiceGender = 'auto';
    this.voiceLanguage = 'en';
    this.realtimeNotes = [];
    this.singingScore = [];
    this.currentIndex = 0;
    this.audioContext = null;
    this.micSource = null;
    this.processor = null;
    this.essentia = null;
    this.pitchReady = false;
  }

  // Getters e setters
  getTab() { return this.tab; }
  setTab(tab) { this.tab = tab; }

  getSelectedFile() { return this.selectedFile; }
  setSelectedFile(file) { this.selectedFile = file; }

  getVoiceGender() { return this.voiceGender; }
  setVoiceGender(gender) { this.voiceGender = gender; }

  getVoiceLanguage() { return this.voiceLanguage; }
  setVoiceLanguage(language) { this.voiceLanguage = language; }

  getResultData() { return this.resultData; }
  setResultData(data) { this.resultData = data; }

  getSingingScore() { return this.singingScore; }
  setSingingScore(score) { this.singingScore = score; }

  getCurrentIndex() { return this.currentIndex; }
  setCurrentIndex(index) { this.currentIndex = index; }

  getRealtimeNotes() { return this.realtimeNotes; }
  addRealtimeNote(note) {
    this.realtimeNotes.push(note);
    if (this.realtimeNotes.length > 200) {
      this.realtimeNotes.shift();
    }
  }
  clearRealtimeNotes() { this.realtimeNotes = []; }

  isPitchReady() { return this.pitchReady; }
  setPitchReady(ready) { this.pitchReady = ready; }

  // Reset methods
  resetRecording() {
    this.recChunks = [];
    this.recSecs = 0;
    if (this.recTimer) {
      clearInterval(this.recTimer);
      this.recTimer = null;
    }
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  resetAnalysis() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}

// Singleton instance
export const state = new State();
