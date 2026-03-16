/**
 * Controlador de interface do usuário
 */
import { state } from '../app/State.js';
import { formatTime, escapeHtml } from '../utils/NoteUtils.js';

export class UIController {
  constructor() {
    this.initializeEventListeners();
  }

  /**
   * Inicializa event listeners globais
   */
  initializeEventListeners() {
    // Auto-setup server URL
    this.setupAutoServerUrl();

    // File drag and drop
    this.initializeDragDrop();

    // Audio events
    window.addEventListener('audioDataAvailable', this.handleAudioData.bind(this));
    window.addEventListener('audioRecordingStopped', this.handleAudioStop.bind(this));
  }

  /**
   * Configura URL do servidor automaticamente se mesma origem
   */
  setupAutoServerUrl() {
    const base = window.location.origin;
    const sUrl = document.getElementById('sUrl');

    if (sUrl && !sUrl.value && (base.startsWith('http://') || base.startsWith('https://'))) {
      sUrl.placeholder = base;
      sUrl.value = base;
    }
  }

  /**
   * Inicializa drag and drop para arquivos
   */
  initializeDragDrop() {
    const dropZone = document.getElementById('dz');
    if (!dropZone) return;

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag');

      const file = e.dataTransfer.files[0];
      if (file) {
        state.setSelectedFile(file);
        this.updateFileName(file.name);
      }
    });
  }

  /**
   * Alterna entre abas
   */
  switchTab(tabName, element) {
    state.setTab(tabName);

    // Esconde todas as abas
    ['upload', 'url', 'mic'].forEach(tab => {
      const tabElement = document.getElementById(`tab-${tab}`);
      if (tabElement) {
        tabElement.classList.toggle('hidden', tab !== tabName);
      }
    });

    // Atualiza estado visual dos botões
    document.querySelectorAll('.tab[data-tab]').forEach(tab => {
      tab.classList.remove('active');
    });
    if (element) element.classList.add('active');
  }

  /**
   * Define gênero vocal
   */
  setGender(gender, element) {
    state.setVoiceGender(gender);

    // Atualiza UI
    ['gAuto', 'gMale', 'gFemale'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.classList.remove('active');
    });
    if (element) element.classList.add('active');
  }

  /**
   * Define idioma
   */
  setLanguage(language, element) {
    state.setVoiceLanguage(language);

    // Atualiza UI
    ['langEn', 'langPt'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.classList.remove('active');
    });
    if (element) element.classList.add('active');
  }

  /**
   * Atualiza nome do arquivo selecionado
   */
  updateFileName(fileName) {
    const fileNameElement = document.getElementById('dfName');
    if (fileNameElement) {
      fileNameElement.textContent = fileName;
    }
  }

  /**
   * Mostra progresso da análise
   */
  showProgress(message, percentage) {
    const progressWrap = document.getElementById('pWrap');
    const progressMsg = document.getElementById('pMsg');
    const progressFill = document.getElementById('pFill');
    const errorBox = document.getElementById('errBox');

    if (progressWrap) progressWrap.classList.remove('hidden');
    if (progressMsg) progressMsg.textContent = message;
    if (progressFill) progressFill.style.width = `${percentage}%`;
    if (errorBox) errorBox.style.display = 'none';
  }

  /**
   * Esconde progresso
   */
  hideProgress() {
    const progressWrap = document.getElementById('pWrap');
    if (progressWrap) progressWrap.classList.add('hidden');
  }

  /**
   * Mostra mensagem de erro
   */
  showError(message) {
    const errorBox = document.getElementById('errBox');
    const progressWrap = document.getElementById('pWrap');

    if (errorBox) {
      errorBox.textContent = message;
      errorBox.style.display = 'block';
    }
    if (progressWrap) progressWrap.classList.add('hidden');

    setTimeout(() => {
      if (errorBox) errorBox.style.display = 'none';
    }, 10000);
  }

  /**
   * Atualiza status do botão de gravação
   */
  updateRecordingButton(isRecording) {
    const btn = document.getElementById('recBtn');
    const dot = document.getElementById('rDot');
    const status = document.getElementById('rStatus');
    const timer = document.getElementById('rTime');

    if (!btn) return;

    if (isRecording) {
      btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12"/></svg>Parar';
      btn.classList.add('btn-d');
      btn.classList.remove('btn-p');
      if (dot) dot.className = 'rdot on';
      if (status) status.textContent = 'Gravando...';
    } else {
      btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>Gravar';
      btn.classList.remove('btn-d');
      btn.classList.add('btn-p');
      if (dot) dot.className = 'rdot';
      if (status) status.textContent = `Pronto (${state.recSecs}s)`;
      if (timer) timer.textContent = '';
    }
  }

  /**
   * Atualiza timer de gravação
   */
  updateRecordingTimer() {
    const timerElement = document.getElementById('rTime');
    if (timerElement) {
      timerElement.textContent = state.recSecs + 's';
    }
  }

  /**
   * Renderiza resultados da análise
   */
  async renderResults(data) {
    const words = data.words || [];
    if (!words.length) {
      this.showError('Nenhuma palavra retornada.');
      return;
    }

    await this.updateMetrics(words);
    this.renderCifra(words);
    this.renderLyrics(words);
    this.updateSavedHint(data);

    const resultsElement = document.getElementById('results');
    if (resultsElement) resultsElement.classList.remove('hidden');
  }

  /**
   * Atualiza métricas
   */
  async updateMetrics(words) {
    // Importa funções de nota
    const { noteToMidi, midiToNote } = await import('../utils/NoteUtils.js');

    const midis = words.map(w => noteToMidi(w.note)).filter(m => m !== null);
    const sorted = [...midis].sort((a, b) => a - b);
    const lo = sorted[0] ?? 48;
    const hi = sorted[sorted.length - 1] ?? 72;
    const p20 = sorted[Math.floor(sorted.length * .2)] ?? lo;
    const p80 = sorted[Math.floor(sorted.length * .8)] ?? hi;

    let hard = 0;
    midis.forEach(m => {
      if (m >= lo + (hi - lo) * .82) hard++;
    });

    // Atualiza DOM
    this.updateElement('mW', words.length);
    this.updateElement('mR', midis.length ? `${midiToNote(lo)}–${midiToNote(hi)}` : '—');
    this.updateElement('mT', midis.length ? `${midiToNote(p20)}–${midiToNote(p80)}` : '—');
    this.updateElement('mS', midis.length ? `${hi - lo} st` : '—');
    this.updateElement('mD', midis.length ? `${Math.round(hard / midis.length * 100)}%` : '0%');
  }

  /**
   * Renderiza cifra
   */
  renderCifra(words) {
    const cifraElement = document.getElementById('cifra');
    if (!cifraElement) return;

    cifraElement.innerHTML = '';
    const WPL = 7;

    for (let i = 0; i < words.length; i += WPL) {
      const line = words.slice(i, i + WPL);
      const div = document.createElement('div');
      div.className = 'cifra-line';

      let last = null;
      line.forEach(w => {
        const col = document.createElement('div');
        col.className = 'wcol';

        const noteElement = document.createElement('div');
        noteElement.className = 'nlbl';

        if (w.note && w.note !== last) {
          noteElement.textContent = w.note;
          noteElement.style.color = '#888'; // Será atualizado com cor correta
          last = w.note;
        } else {
          noteElement.innerHTML = '&nbsp;';
        }

        const wordElement = document.createElement('div');
        wordElement.className = 'wtxt';
        wordElement.textContent = w.text;

        col.appendChild(noteElement);
        col.appendChild(wordElement);
        div.appendChild(col);
      });

      cifraElement.appendChild(div);
    }
  }

  /**
   * Renderiza letras
   */
  renderLyrics(words) {
    const lyricsElement = document.getElementById('lyrics');
    if (!lyricsElement) return;

    lyricsElement.innerHTML = '';
    const WPL = 10;

    for (let i = 0; i < words.length; i += WPL) {
      const line = words.slice(i, i + WPL);
      const p = document.createElement('p');
      p.style.marginBottom = '2px';

      line.forEach((w, idx) => {
        const span = document.createElement('span');
        span.textContent = w.text + (idx < line.length - 1 ? ' ' : '');
        if (w.start !== undefined) span.title = w.start.toFixed(2) + 's';
        p.appendChild(span);
      });

      lyricsElement.appendChild(p);
    }
  }

  /**
   * Atualiza hint de cifra salva
   */
  updateSavedHint(data) {
    const savedHint = document.getElementById('savedHint');
    if (savedHint) {
      savedHint.classList.toggle('hidden', !(data && data.score_id));
    }
  }

  /**
   * Renderiza lista de cifras
   */
  renderScoresList(scores) {
    const listElement = document.getElementById('scoresList');
    const emptyElement = document.getElementById('scoresEmpty');

    if (!listElement || !emptyElement) return;

    listElement.innerHTML = '';

    if (scores.length === 0) {
      emptyElement.classList.remove('hidden');
    } else {
      emptyElement.classList.add('hidden');

      scores.forEach(score => {
        const scoreItem = this.createScoreItem(score);
        listElement.appendChild(scoreItem);
      });
    }
  }

  /**
   * Cria item de cifra na lista
   */
  createScoreItem(score) {
    const div = document.createElement('div');
    div.className = 'score-item';

    div.innerHTML = `
      <div onclick="window.app.openScore(${score.id})" style="flex:1;cursor:pointer">
        <div class="score-item-title">${escapeHtml(score.title || 'Sem título')}</div>
        <div class="score-item-meta">${score.duration != null ? Math.round(score.duration) + 's' : ''} ${score.language ? ' · ' + score.language : ''}</div>
      </div>
      <div class="score-item-actions">
        <span class="score-item-btn" onclick="event.stopPropagation(); window.app.openScore(${score.id})">Ver</span>
        <button type="button" class="btn btn-sm btn-del" onclick="event.stopPropagation(); window.app.deleteScore(${score.id}, this)">Excluir</button>
      </div>
    `;

    return div;
  }

  /**
   * Mostra/esconde visualização de cifras
   */
  showScoresView() {
    document.querySelector('.card')?.classList.remove('hidden');
    document.querySelector('.arow')?.classList.add('hidden');
    document.getElementById('results')?.classList.add('hidden');
    document.getElementById('scoresView')?.classList.remove('hidden');
  }

  hideScoresView() {
    document.getElementById('scoresView')?.classList.add('hidden');
    document.querySelector('.card')?.classList.remove('hidden');
    document.querySelector('.arow')?.classList.remove('hidden');
  }

  /**
   * Renderiza score para cantar
   */
  renderSingingScore(words) {
    const element = document.getElementById("singingScore");
    if (!element) return;

    element.innerHTML = "";
    words.forEach((w, i) => {
      const span = document.createElement("span");
      span.id = "sing-" + i;
      span.style.marginRight = "8px";
      span.innerText = w.word;
      element.appendChild(span);
    });
  }

  /**
   * Pinta feedback de nota cantada
   */
  paintFeedback(index, result) {
    const element = document.getElementById("sing-" + index);
    if (!element) return;

    const colors = {
      correct: "#3B6D11",
      close: "#BA7517",
      wrong: "#A32D2D"
    };

    element.style.color = colors[result] || "#888";
  }

  /**
   * Atualiza elemento DOM
   */
  updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  /**
   * Handlers de eventos de áudio
   */
  handleAudioData(event) {
    // Será implementado no controller principal
  }

  handleAudioStop(event) {
    // Será implementado no controller principal
  }

  /**
   * Esconde visualização de cifras
   */
  hideScoresView() {
    document.getElementById('scoresView')?.classList.add('hidden');
    document.querySelector('.card')?.classList.remove('hidden');
    document.querySelector('.arow')?.classList.remove('hidden');
  }
}

export const uiController = new UIController();
