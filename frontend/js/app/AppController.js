/**
 * Controller principal da aplicação
 */
import { state } from './State.js';
import { apiService } from '../services/ApiService.js';
import { audioService } from '../services/AudioService.js';
import { pitchService } from '../services/PitchService.js';
import { realtimePitchService } from '../services/RealtimePitchService.js';
import { uiController } from '../ui/UIController.js';
import { realtimePitchUI } from '../ui/RealtimePitchUI.js';
import { noteToMidi, midiToNote, formatTime } from '../utils/NoteUtils.js';

export class AppController {
  constructor() {
    this.recTimer = null;
    this.pollTimer = null;
    this.initializeEventHandlers();
    this.initializeRealtimePitch();
  }

  /**
   * Inicializa handlers de eventos
   */
  initializeEventHandlers() {
    // Eventos de áudio
    window.addEventListener('audioDataAvailable', this.handleAudioData.bind(this));
    window.addEventListener('audioRecordingStopped', this.handleAudioStop.bind(this));
  }

  /**
   * Inicializa serviço de realtime pitch
   */
  initializeRealtimePitch() {
    // Configura callbacks do serviço
    realtimePitchService.setCallbacks({
      onPitchDetected: this.handlePitchDetected.bind(this),
      onRangeUpdate: this.handleRangeUpdate.bind(this)
    });

    // Configura callbacks da UI
    realtimePitchUI.setCallbacks({
      onStart: this.startRealtimePitch.bind(this),
      onStop: this.stopRealtimePitch.bind(this)
    });
  }

  /**
   * Inicia gravação do microfone
   */
  async toggleRecording() {
    if (audioService.isRecording()) {
      this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  /**
   * Inicia gravação
   */
  async startRecording() {
    try {
      state.resetRecording();
      await audioService.startRecording();

      uiController.updateRecordingButton(true);

      // Inicia timer
      state.recSecs = 0;
      this.recTimer = setInterval(() => {
        state.recSecs++;
        uiController.updateRecordingTimer();
      }, 1000);

    } catch (error) {
      uiController.showError(error.message);
    }
  }

  /**
   * Para gravação
   */
  stopRecording() {
    audioService.stopRecording();

    if (this.recTimer) {
      clearInterval(this.recTimer);
      this.recTimer = null;
    }

    uiController.updateRecordingButton(false);
  }

  /**
   * Handle dados de áudio disponíveis
   */
  handleAudioData(event) {
    state.recChunks.push(event.detail.data);
  }

  /**
   * Handle fim da gravação
   */
  async handleAudioStop() {
    if (state.recChunks.length === 0) return;

    const blob = new Blob(state.recChunks, { type: 'audio/wav' });
    const file = new File([blob], 'gravacao.wav', { type: 'audio/wav' });

    state.setSelectedFile(file);
    uiController.updateFileName(file.name);

    state.resetRecording();
  }

  /**
   * Processa arquivo selecionado
   */
  onFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
      state.setSelectedFile(file);
      uiController.updateFileName(file.name);
    }
  }

  /**
   * Análise de áudio
   */
  async analyze() {
    try {
      uiController.showProgress('Enviando arquivo...', 5);

      let response;
      const currentTab = state.getTab();

      if (currentTab === 'url') {
        const audioUrl = document.getElementById('supaUrl')?.value?.trim();
        const anonKey = document.getElementById('anonKey')?.value?.trim();

        response = await apiService.transcribeUrl(
          audioUrl,
          anonKey,
          state.getVoiceGender(),
          state.getVoiceLanguage()
        );
      } else {
        const selectedFile = state.getSelectedFile();
        if (!selectedFile) {
          uiController.showError('Selecione ou grave um arquivo.');
          return;
        }

        uiController.showProgress(`Enviando ${Math.round(selectedFile.size / 1024)} KB...`, 8);

        response = await apiService.transcribeFile(
          selectedFile,
          state.getVoiceGender(),
          state.getVoiceLanguage()
        );
      }

      uiController.showProgress('Processando no servidor...', 15);
      await this.startJobPolling(response.job_id);

    } catch (error) {
      uiController.showError(error.message);
      this.resetAnalysisState();
    }
  }

  /**
   * Inicia polling do job de análise
   */
  async startJobPolling(jobId) {
    let elapsed = 0;

    this.pollTimer = setInterval(async () => {
      elapsed += 5;

      try {
        const job = await apiService.checkJobStatus(jobId);

        if (job.status === 'transcribing' || job.status === 'queued') {
          const percentage = Math.min(15 + Math.round((elapsed / 600) * 70), 82);
          const timeStr = `${Math.floor(elapsed / 60)}m${elapsed % 60}s`;
          uiController.showProgress(`Transcrevendo com Whisper large-v3... (${timeStr})`, percentage);

        } else if (job.status === 'pitch') {
          uiController.showProgress('Detectando notas (pitch)...', 85);

        } else if (job.status === 'done') {
          this.completeAnalysis(job.result);

        } else if (job.status === 'error') {
          uiController.showError(job.message || 'Erro no servidor.');
          this.resetAnalysisState();
        }

      } catch (error) {
        uiController.showError('Conexão perdida: ' + error.message);
        this.resetAnalysisState();
      }
    }, 5000);
  }

  /**
   * Completa análise
   */
  async completeAnalysis(result) {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    uiController.showProgress('Concluído!', 100);
    setTimeout(() => uiController.hideProgress(), 1200);

    state.setResultData(result);
    await uiController.renderResults(result);

    this.resetAnalysisState();
  }

  /**
   * Reseta estado da análise
   */
  resetAnalysisState() {
    const analyzeBtn = document.getElementById('aBtn');
    if (analyzeBtn) analyzeBtn.disabled = false;

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * Carrega cifras salvas
   */
  async loadScores() {
    try {
      const scores = await apiService.loadScores();
      uiController.renderScoresList(scores);
      uiController.showScoresView();
    } catch (error) {
      uiController.showError(error.message);
    }
  }

  /**
   * Abre cifra específica
   */
  async openScore(id) {
    try {
      const data = await apiService.loadScore(id);

      state.setResultData({
        words: data.words,
        language: data.language,
        duration: data.duration
      });

      await uiController.renderResults(state.getResultData());
      uiController.hideScoresView();

    } catch (error) {
      uiController.showError(error.message);
    }
  }

  /**
   * Exclui cifra
   */
  async deleteScore(id, buttonElement) {
    if (!confirm('Excluir esta cifra? Não é possível desfazer.')) return;

    try {
      await apiService.deleteScore(id);

      const row = buttonElement.closest('.score-item');
      if (row) row.remove();

      const listElement = document.getElementById('scoresList');
      const emptyElement = document.getElementById('scoresEmpty');

      if (listElement && listElement.children.length === 0 && emptyElement) {
        emptyElement.classList.remove('hidden');
      }

    } catch (error) {
      uiController.showError(error.message);
    }
  }

  /**
   * Inicia modo de canto
   */
  async startSinging() {
    const resultData = state.getResultData();
    if (!resultData || !resultData.words) {
      uiController.showError('Analise um áudio primeiro para obter as notas.');
      return;
    }

    // Carrega score para cantar
    const singingScore = resultData.words.map(w => ({
      word: w.text,
      note: w.note,
      start: w.start
    }));

    state.setSingingScore(singingScore);
    uiController.renderSingingScore(singingScore);
    state.setCurrentIndex(0);

    // Inicializa pitch engine
    await pitchService.initPitchEngine();

    // Inicia áudio para pitch detection
    const audioData = await audioService.initAudioContext();

    audioData.processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const freq = pitchService.detectPitch(input, audioService.audioContext.sampleRate);

      if (freq > 90 && freq < 600) {
        const note = pitchService.freqToNote(freq);
        const midi = pitchService.noteToMidi(note);

        state.addRealtimeNote(midi);
        this.comparePitch(note);
        this.updateRealtimeRange();
      }
    };
  }

  /**
   * Compara nota cantada com alvo
   */
  comparePitch(sungNote) {
    const singingScore = state.getSingingScore();
    const currentIndex = state.getCurrentIndex();

    const target = singingScore[currentIndex];
    if (!target || !target.note) return;

    const result = pitchService.compareNotes(sungNote, target.note);
    uiController.paintFeedback(currentIndex, result);

    if (result === 'correct') {
      state.setCurrentIndex(currentIndex + 1);
    }
  }

  /**
   * Atualiza range vocal em tempo real
   */
  updateRealtimeRange() {
    const realtimeNotes = state.getRealtimeNotes();

    if (realtimeNotes.length < 8) return;

    const sorted = [...realtimeNotes].sort((a, b) => a - b);
    const low = sorted[0];
    const high = sorted[sorted.length - 1];

    const element = document.getElementById("voiceRange");
    if (element) {
      element.innerText = `Vocal range atual: ${midiToNote(low)} – ${midiToNote(high)}`;
    }
  }

  /**
   * Exporta PDF
   */
  exportPDF() {
    const resultData = state.getResultData();
    if (!resultData) return;

    const words = resultData.words || [];
    const WPL = 8;

    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;padding:32px;color:#111}h1{font-size:22px;color:#534AB7;margin-bottom:4px}.sub{color:#888;font-size:12px;margin-bottom:28px}.ln{margin-bottom:18px;page-break-inside:avoid}.n{font-family:'Courier New',monospace;font-size:10px;font-weight:700;min-height:14px}.l{font-size:14px}</style></head><body><h1>PitchMVP — Cifra</h1><div class="sub">${resultData.duration ? Math.floor(resultData.duration / 60) + 'm ' + Math.round(resultData.duration % 60) + 's' : ''} · ${words.length} palavras</div>`;

    for (let i = 0; i < words.length; i += WPL) {
      const line = words.slice(i, i + WPL);
      let noteRow = '', wordRow = '';
      let last = null;

      line.forEach(w => {
        const pad = Math.max(w.text.length, (w.note || '').length) + 2;
        noteRow += (w.note && w.note !== last ? w.note : '').padEnd(pad);
        wordRow += w.text.padEnd(pad);
        if (w.note) last = w.note;
      });

      html += `<div class="ln"><div class="n">${noteRow.replace(/ /g, '&nbsp;')}</div><div class="l">${wordRow.replace(/ /g, '&nbsp;')}</div></div>`;
    }

    html += '</body></html>';
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 400);
  }

  /**
   * Copia letras
   */
  copyLyrics(button) {
    const resultData = state.getResultData();
    if (!resultData) return;

    const text = (resultData.words || []).map(w => w.text).join(' ');
    navigator.clipboard.writeText(text).then(() => {
      const originalText = button.textContent;
      button.textContent = 'Copiado!';
      setTimeout(() => button.textContent = originalText, 1500);
    });
  }

  /**
   * Inicia detecção de pitch em tempo real - MODO LOCAL
   */
  async startRealtimePitchLocal() {
    try {
      console.log('Iniciando pitch detection LOCAL...');
      await realtimePitchService.startRealtimeDetectionLocal();

      // Configura callbacks da UI
      realtimePitchUI.setCallbacks({
        onStart: () => this.startRealtimePitch(),
        onStop: () => this.stopRealtimePitch()
      });

      console.log('Pitch detection LOCAL iniciado');
    } catch (error) {
      console.error('Erro ao iniciar pitch LOCAL:', error);
      throw error;
    }
  }

  /**
   * Inicia detecção de pitch em tempo real - MODO REMOTO
   */
  async startRealtimePitchRemote(backendUrl = '') {
    try {
      console.log('Iniciando pitch detection REMOTO...');
      await realtimePitchService.startRealtimeDetectionRemote(backendUrl);

      // Configura callbacks da UI
      realtimePitchUI.setCallbacks({
        onStart: () => this.startRealtimePitch(),
        onStop: () => this.stopRealtimePitch()
      });

      console.log('Pitch detection REMOTO iniciado');
    } catch (error) {
      console.error('Erro ao iniciar pitch REMOTO:', error);
      throw error;
    }
  }

  /**
   * Inicia detecção de pitch em tempo real (método legado)
   */
  async startRealtimePitch() {
    try {
      await realtimePitchService.startRealtimeDetection();
      realtimePitchUI.updateButtonStates(true);
      realtimePitchUI.startUpdates(() => {
        const stats = realtimePitchService.getCurrentStats();
        realtimePitchUI.updateStats(stats);
      });
      uiController.showProgress('Detecção de pitch ativa', 100);
    } catch (error) {
      uiController.showError(error.message);
    }
  }

  /**
   * Para detecção de pitch em tempo real
   */
  stopRealtimePitch() {
    realtimePitchService.stopRealtimeDetection();
    realtimePitchUI.updateButtonStates(false);
    realtimePitchUI.stopUpdates();
    uiController.hideProgress();
  }

  /**
   * Mostra/oculta interface de realtime pitch
   */
  toggleRealtimePitchUI() {
    if (realtimePitchUI.isVisible) {
      realtimePitchUI.hide();
      this.stopRealtimePitch();
    } else {
      realtimePitchUI.show();
    }
  }

  /**
   * Handle de pitch detectado
   */
  handlePitchDetected(pitchData) {
    realtimePitchUI.updatePitchDisplay(pitchData);

    // Se estiver em modo de prática, compara com nota alvo
    if (state.getSingingScore().length > 0) {
      this.comparePitch(pitchData.note);
    }
  }

  /**
   * Handle de atualização de range
   */
  handleRangeUpdate(rangeData) {
    realtimePitchUI.updateRangeDisplay(rangeData);
  }

  /**
   * Ping do servidor
   */
  pingServer() {
    apiService.pingServer();
  }

  /**
   * Funções de UI expostas globalmente
   */
  getUIFunctions() {
    const self = this;
    return {
      switchTab: uiController.switchTab.bind(uiController),
      setGender: uiController.setGender.bind(uiController),
      setLanguage: uiController.setLanguage.bind(uiController),
      onFile: this.onFileSelect.bind(this),
      toggleRec: this.toggleRecording.bind(this),
      analyze: this.analyze.bind(this),
      startSinging: this.startSinging.bind(this),
      loadScores: this.loadScores.bind(this),
      openScore: this.openScore.bind(this),
      deleteScore: this.deleteScore.bind(this),
      exportPDF: this.exportPDF.bind(this),
      copyLyrics: this.copyLyrics.bind(this),
      pingServer: this.pingServer.bind(this),
      startRealtimePitchLocal: this.startRealtimePitchLocal.bind(this),
      startRealtimePitchRemote: this.startRealtimePitchRemote.bind(this),
      stopRealtimePitch: this.stopRealtimePitch.bind(this)
    };
  }
}

// Singleton instance
export const appController = new AppController();
