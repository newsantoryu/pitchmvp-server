class Controls {
  constructor(container) {
    this.container = container;
    this.isAnalyzing = false;
    this.render();
    this.bindEvents();
  }

  render() {
    this.container.innerHTML = `
      <div class="arow">
        <button class="btn btn-p" id="aBtn" style="padding:10px 24px;font-size:14px">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>Analisar
        </button>
        <div class="prog-wrap hidden" id="pWrap">
          <div class="prog-msg" id="pMsg">Iniciando...</div>
          <div class="prog-track">
            <div class="prog-fill" id="pFill"></div>
          </div>
        </div>
        <div class="err-box" id="errBox"></div>
      </div>
    `;
  }

  bindEvents() {
    const analyzeBtn = document.getElementById('aBtn');
    if (analyzeBtn) {
      analyzeBtn.addEventListener('click', () => {
        if (!this.isAnalyzing) {
          this.startAnalysis();
        }
      });
    }
  }

  startAnalysis() {
    if (typeof window.analyze === 'function') {
      this.isAnalyzing = true;
      this.setAnalyzingButton(true);
      window.analyze().finally(() => {
        this.isAnalyzing = false;
        this.setAnalyzingButton(false);
      });
    }
  }

  setAnalyzingButton(analyzing) {
    const btn = document.getElementById('aBtn');
    if (btn) {
      btn.disabled = analyzing;
    }
  }

  setProgress(message, percentage) {
    const progressWrap = document.getElementById('pWrap');
    const progressMsg = document.getElementById('pMsg');
    const progressFill = document.getElementById('pFill');
    const errorBox = document.getElementById('errBox');

    if (progressWrap) progressWrap.classList.remove('hidden');
    if (progressMsg) progressMsg.textContent = message;
    if (progressFill) progressFill.style.width = `${percentage}%`;
    if (errorBox) errorBox.style.display = 'none';
  }

  hideProgress() {
    const progressWrap = document.getElementById('pWrap');
    if (progressWrap) progressWrap.classList.add('hidden');
  }

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

  hideError() {
    const errorBox = document.getElementById('errBox');
    if (errorBox) errorBox.style.display = 'none';
  }
}

window.Controls = Controls;
