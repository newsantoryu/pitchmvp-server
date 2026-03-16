/**
 * Controlador de UI para detecção de pitch em tempo real
 */
export class RealtimePitchUI {
  constructor() {
    this.isVisible = false;
    this.currentPitchData = null;
    this.rangeData = null;
    this.updateInterval = null;
    this.initializeElements();
  }

  /**
   * Inicializa elementos DOM
   */
  initializeElements() {
    this.elements = {
      container: document.getElementById('realtimePitchContainer'),
      startBtn: document.getElementById('startRealtimeBtn'),
      stopBtn: document.getElementById('stopRealtimeBtn'),
      noteDisplay: document.getElementById('note'),
      freqDisplay: document.getElementById('freq'),
      centsDisplay: document.getElementById('cents'),
      rangeDisplay: document.getElementById('voiceRange'),
      stabilityDisplay: document.getElementById('noteStability'),
      avgFreqDisplay: document.getElementById('avgFreq')
    };
  }

  /**
   * Renderiza o componente realtime pitch
   */
  render() {
    const container = this.elements.container || document.getElementById('realtimePitchContainer');
    if (!container) return;

    container.innerHTML = `
      <div id="realtimePitchView" class="hidden">
        <div class="card">
          <div class="sec-hdr">
            <div class="clabel" style="margin:0">🎵 Pitch em Tempo Real</div>
            <button class="btn btn-sm" id="closeRealtimeBtn">×</button>
          </div>
          
          <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">
            <button class="btn btn-p" id="startRealtimeBtn">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>Iniciar
            </button>
            <button class="btn btn-d" id="stopRealtimeBtn" disabled>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12"/>
              </svg>Parar
            </button>
          </div>

          <div class="metrics" style="margin-bottom:20px">
            <div class="metric">
              <div class="mval" id="note">-</div>
              <div class="mlbl">Nota atual</div>
            </div>
            <div class="metric">
              <div class="mval" id="freq">0.00</div>
              <div class="mlbl">Frequência (Hz)</div>
            </div>
            <div class="metric">
              <div class="mval" id="cents">0</div>
              <div class="mlbl">Cents</div>
            </div>
            <div class="metric">
              <div class="mval" id="noteStability">0%</div>
              <div class="mlbl">Estabilidade</div>
            </div>
          </div>

          <div class="card" style="background:var(--surface2)">
            <div class="clabel" style="margin:0;font-size:11px">Range Vocal</div>
            <div id="voiceRange" style="font-size:16px;color:var(--purple);margin-top:8px;font-weight:600">
              Aguardando...
            </div>
            <div style="display:flex;gap:20px;margin-top:12px;font-size:13px;color:var(--muted)">
              <div>Média: <span id="avgFreq" style="color:var(--text)">-</span> Hz</div>
              <div>Amostras: <span id="sampleCount" style="color:var(--text)">0</span></div>
            </div>
          </div>

          <div style="margin-top:20px">
            <div class="clabel" style="margin:0;font-size:11px">Visualização</div>
            <canvas id="pitchCanvas" style="width:100%;height:100px;border:1px solid var(--border);border-radius:8px;margin-top:8px;background:var(--surface2)"></canvas>
          </div>
        </div>
      </div>
    `;

    this.rebindElements();
    this.bindEvents();
  }

  /**
   * Rebind elementos após renderização
   */
  rebindElements() {
    this.elements = {
      container: document.getElementById('realtimePitchContainer'),
      view: document.getElementById('realtimePitchView'),
      startBtn: document.getElementById('startRealtimeBtn'),
      stopBtn: document.getElementById('stopRealtimeBtn'),
      closeBtn: document.getElementById('closeRealtimeBtn'),
      noteDisplay: document.getElementById('note'),
      freqDisplay: document.getElementById('freq'),
      centsDisplay: document.getElementById('cents'),
      rangeDisplay: document.getElementById('voiceRange'),
      stabilityDisplay: document.getElementById('noteStability'),
      avgFreqDisplay: document.getElementById('avgFreq'),
      sampleCountDisplay: document.getElementById('sampleCount'),
      canvas: document.getElementById('pitchCanvas')
    };
  }

  /**
   * Bind eventos
   */
  bindEvents() {
    if (this.elements.startBtn) {
      this.elements.startBtn.addEventListener('click', () => {
        this.onStart();
      });
    }

    if (this.elements.stopBtn) {
      this.elements.stopBtn.addEventListener('click', () => {
        this.onStop();
      });
    }

    if (this.elements.closeBtn) {
      this.elements.closeBtn.addEventListener('click', () => {
        this.hide();
      });
    }
  }

  /**
   * Mostra o componente
   */
  show() {
    if (this.elements.view) {
      this.elements.view.classList.remove('hidden');
    }
    this.isVisible = true;
    this.initializeCanvas();
  }

  /**
   * Esconde o componente
   */
  hide() {
    if (this.elements.view) {
      this.elements.view.classList.add('hidden');
    }
    this.isVisible = false;
    this.stopUpdates();
  }

  /**
   * Inicializa canvas para visualização
   */
  initializeCanvas() {
    if (!this.elements.canvas) return;

    this.canvasCtx = this.elements.canvas.getContext('2d');
    this.pitchHistory = [];
    this.maxHistoryLength = 50;
  }

  /**
   * Atualiza display com dados do pitch
   */
  updatePitchDisplay(pitchData) {
    this.currentPitchData = pitchData;

    if (this.elements.noteDisplay) {
      this.elements.noteDisplay.textContent = pitchData.note;
    }
    if (this.elements.freqDisplay) {
      this.elements.freqDisplay.textContent = pitchData.frequency.toFixed(2);
    }
    if (this.elements.centsDisplay) {
      this.elements.centsDisplay.textContent = pitchData.cents;
    }

    // Atualiza visualização
    this.updateVisualization(pitchData);
  }

  /**
   * Atualiza display do range vocal
   */
  updateRangeDisplay(rangeData) {
    this.rangeData = rangeData;

    if (this.elements.rangeDisplay) {
      this.elements.rangeDisplay.textContent = 
        `${rangeData.lowest} – ${rangeData.highest}`;
    }
  }

  /**
   * Atualiza estatísticas
   */
  updateStats(stats) {
    if (this.elements.stabilityDisplay) {
      this.elements.stabilityDisplay.textContent = stats.noteStability + '%';
    }
    if (this.elements.avgFreqDisplay) {
      this.elements.avgFreqDisplay.textContent = stats.averageFrequency.toFixed(1);
    }
    if (this.elements.sampleCountDisplay) {
      this.elements.sampleCountDisplay.textContent = this.pitchHistory.length;
    }
  }

  /**
   * Atualiza visualização no canvas
   */
  updateVisualization(pitchData) {
    if (!this.canvasCtx || !this.elements.canvas) return;

    // Adiciona ao histórico
    this.pitchHistory.push(pitchData.midi);
    if (this.pitchHistory.length > this.maxHistoryLength) {
      this.pitchHistory.shift();
    }

    // Limpa canvas
    const canvas = this.elements.canvas;
    this.canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    // Desenha linha do pitch
    this.canvasCtx.strokeStyle = '#534AB7';
    this.canvasCtx.lineWidth = 2;
    this.canvasCtx.beginPath();

    const width = canvas.width;
    const height = canvas.height;
    const stepX = width / this.maxHistoryLength;

    this.pitchHistory.forEach((midi, index) => {
      const x = index * stepX;
      // Mapeia MIDI (36-84) para altura do canvas
      const normalizedMidi = (midi - 36) / (84 - 36);
      const y = height - (normalizedMidi * height * 0.8 + height * 0.1);

      if (index === 0) {
        this.canvasCtx.moveTo(x, y);
      } else {
        this.canvasCtx.lineTo(x, y);
      }
    });

    this.canvasCtx.stroke();

    // Desenha linha central (C4)
    this.canvasCtx.strokeStyle = '#888';
    this.canvasCtx.lineWidth = 1;
    this.canvasCtx.setLineDash([5, 5]);
    this.canvasCtx.beginPath();
    const centerMidi = 60; // C4
    const centerY = height - ((centerMidi - 36) / (84 - 36) * height * 0.8 + height * 0.1);
    this.canvasCtx.moveTo(0, centerY);
    this.canvasCtx.lineTo(width, centerY);
    this.canvasCtx.stroke();
    this.canvasCtx.setLineDash([]);
  }

  /**
   * Atualiza estado dos botões
   */
  updateButtonStates(isActive) {
    if (this.elements.startBtn) {
      this.elements.startBtn.disabled = isActive;
    }
    if (this.elements.stopBtn) {
      this.elements.stopBtn.disabled = !isActive;
    }
  }

  /**
   * Inicia atualizações periódicas
   */
  startUpdates(updateCallback) {
    this.updateInterval = setInterval(() => {
      if (updateCallback) {
        updateCallback();
      }
    }, 100); // Atualiza a cada 100ms
  }

  /**
   * Para atualizações periódicas
   */
  stopUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Callbacks para eventos
   */
  onStart() {
    // Será definido externamente
  }

  onStop() {
    // Será definido externamente
  }

  /**
   * Define callbacks externos
   */
  setCallbacks(callbacks) {
    if (callbacks.onStart) {
      this.onStart = callbacks.onStart;
    }
    if (callbacks.onStop) {
      this.onStop = callbacks.onStop;
    }
  }

  /**
   * Limpa recursos
   */
  cleanup() {
    this.stopUpdates();
    this.pitchHistory = [];
    this.currentPitchData = null;
    this.rangeData = null;
  }
}

// Singleton instance
export const realtimePitchUI = new RealtimePitchUI();
