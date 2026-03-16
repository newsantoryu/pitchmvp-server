class Header {
  constructor(container) {
    this.container = container;
    this.render();
    this.bindEvents();
  }

  render() {
    this.container.innerHTML = `
      <div class="header">
        <div class="logo">
          <div class="logo-icon">
            <svg viewBox="0 0 24 24">
              <path d="M12 3a9 9 0 100 18A9 9 0 0012 3zm0 2a7 7 0 110 14A7 7 0 0112 5zm0 2a5 5 0 100 10A5 5 0 0012 7zm0 2a3 3 0 110 6 3 3 0 010-6z" />
            </svg>
          </div>
          <div>
            <div class="logo-name">PitchMVP</div>
            <div class="logo-sub">Transcrição · Pitch · Cifra</div>
          </div>
          <button class="btn btn-p" id="startSingingBtn">
            🎤 Cantar
          </button>
        </div>
        <button id="loadScoresBtn">📚 Minhas cifras</button>
        <div class="server-row">
          <div class="dot" id="sDot"></div>
          <input class="server-in" id="sUrl" type="text" placeholder="https://seu-ngrok.ngrok-free.app" />
        </div>
      </div>
    `;
  }

  bindEvents() {
    const startBtn = document.getElementById('startSingingBtn');
    const loadScoresBtn = document.getElementById('loadScoresBtn');
    const serverInput = document.getElementById('sUrl');

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        if (typeof window.startSinging === 'function') {
          window.startSinging();
        }
      });
    }

    if (loadScoresBtn) {
      loadScoresBtn.addEventListener('click', () => {
        if (typeof window.loadScores === 'function') {
          window.loadScores();
        }
      });
    }

    if (serverInput) {
      serverInput.addEventListener('input', () => {
        if (typeof window.pingServer === 'function') {
          window.pingServer();
        }
      });
    }
  }

  getServerUrl() {
    return (document.getElementById('sUrl')?.value || '').trim().replace(/\/$/, '');
  }

  setServerStatus(status) {
    const dot = document.getElementById('sDot');
    if (dot) {
      dot.className = `dot ${status}`;
    }
  }
}

window.Header = Header;
