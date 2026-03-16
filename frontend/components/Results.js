class Results {
  constructor(container) {
    this.container = container;
    this.resultData = null;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div id="results" class="hidden">
        <div id="metricsContainer"></div>
        
        <p id="savedHint" class="hidden" style="margin-bottom:14px;font-size:13px;color:var(--green);">
          Cifra salva. <button type="button" class="btn btn-sm" id="viewScoresBtn" style="margin-left:6px">Ver em Minhas cifras</button>
        </p>

        <div class="card">
          <div class="sec-hdr">
            <div class="clabel" style="margin:0">Cifra</div>
            <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
              <div class="legend">
                <div class="litem">
                  <div class="ldot" style="background:var(--green)"></div>Confortável
                </div>
                <div class="litem">
                  <div class="ldot" style="background:#BA7517"></div>Médio
                </div>
                <div class="litem">
                  <div class="ldot" style="background:var(--red)"></div>Difícil
                </div>
              </div>
              <button class="btn btn-sm" id="exportPdfBtn">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                </svg>PDF
              </button>
            </div>
          </div>
          <div class="cifra-wrap">
            <div id="cifra"></div>
          </div>
        </div>

        <div id="singingScore" style="font-size:18px;margin-top:20px"></div>

        <div class="card">
          <div class="sec-hdr">
            <div class="clabel" style="margin:0">Letra com timestamps</div>
            <button class="btn btn-sm" id="copyLyricsBtn">Copiar</button>
          </div>
          <div class="lyrics-wrap" id="lyrics"></div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const viewScoresBtn = document.getElementById('viewScoresBtn');
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    const copyLyricsBtn = document.getElementById('copyLyricsBtn');

    if (viewScoresBtn) {
      viewScoresBtn.addEventListener('click', () => {
        if (typeof window.loadScores === 'function') {
          window.loadScores();
        }
      });
    }

    if (exportPdfBtn) {
      exportPdfBtn.addEventListener('click', () => {
        this.exportPDF();
      });
    }

    if (copyLyricsBtn) {
      copyLyricsBtn.addEventListener('click', (e) => {
        this.copyLyrics(e.target);
      });
    }
  }

  show(data) {
    this.resultData = data;
    
    // Initialize metrics component
    const metricsContainer = document.getElementById('metricsContainer');
    if (metricsContainer && !metricsContainer.hasChildNodes()) {
      this.metrics = new Metrics(metricsContainer);
    }
    
    if (this.metrics) {
      this.metrics.updateMetrics(data);
    }

    this.renderCifra(data.words || []);
    this.renderLyrics(data.words || []);
    this.updateSavedHint();
    
    const resultsElement = document.getElementById('results');
    if (resultsElement) resultsElement.classList.remove('hidden');
  }

  hide() {
    const resultsElement = document.getElementById('results');
    if (resultsElement) resultsElement.classList.add('hidden');
  }

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
        const midi = this.noteToMidi(w.note);
        
        if (w.note && w.note !== last) {
          noteElement.textContent = w.note;
          noteElement.style.color = midi ? this.diffColor(midi, words) : '#888';
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

  updateSavedHint() {
    const savedHint = document.getElementById('savedHint');
    if (savedHint) {
      savedHint.classList.toggle('hidden', !(this.resultData && this.resultData.score_id));
    }
  }

  exportPDF() {
    if (!this.resultData) return;
    
    const words = this.resultData.words || [];
    const WPL = 8;
    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;padding:32px;color:#111}h1{font-size:22px;color:#534AB7;margin-bottom:4px}.sub{color:#888;font-size:12px;margin-bottom:28px}.ln{margin-bottom:18px;page-break-inside:avoid}.n{font-family:'Courier New',monospace;font-size:10px;font-weight:700;min-height:14px}.l{font-size:14px}</style></head><body><h1>PitchMVP — Cifra</h1><div class="sub">${this.resultData.duration ? Math.floor(this.resultData.duration / 60) + 'm ' + Math.round(this.resultData.duration % 60) + 's' : ''} · ${words.length} palavras</div>`;
    
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

  copyLyrics(button) {
    if (!this.resultData) return;
    
    const text = (this.resultData.words || []).map(w => w.text).join(' ');
    navigator.clipboard.writeText(text).then(() => {
      const originalText = button.textContent;
      button.textContent = 'Copiado!';
      setTimeout(() => button.textContent = originalText, 1500);
    });
  }

  noteToMidi(note) {
    if (!note) return null;
    const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const match = note.match(/^([A-G]#?)(-?\d+)$/);
    if (!match) return null;
    const noteIndex = NOTES.indexOf(match[1]);
    return noteIndex < 0 ? null : (parseInt(match[2]) + 1) * 12 + noteIndex;
  }

  diffColor(midi, words) {
    const midis = words.map(w => this.noteToMidi(w.note)).filter(m => m !== null);
    const sorted = [...midis].sort((a, b) => a - b);
    const lo = sorted[0] ?? 48;
    const hi = sorted[sorted.length - 1] ?? 72;
    const range = hi - lo;
    
    if (midi >= lo + range * 0.82) return '#A32D2D';
    if (midi >= lo + range * 0.6) return '#BA7517';
    return '#3B6D11';
  }
}

window.Results = Results;
