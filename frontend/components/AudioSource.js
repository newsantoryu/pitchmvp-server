class AudioSource {
  constructor(container) {
    this.container = container;
    this.currentTab = 'upload';
    this.selectedFile = null;
    this.render();
    this.bindEvents();
  }

  render() {
    this.container.innerHTML = `
      <div class="card">
        <div class="clabel">Fonte do áudio</div>
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:14px">
          <div class="tabs" style="margin:0">
            <div class="tab active" data-tab="upload">Upload</div>
            <div class="tab" data-tab="url">URL Supabase</div>
            <div class="tab" data-tab="mic">Microfone</div>
          </div>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <span style="font-size:11px;color:var(--faint)">Registro:</span>
            <button class="tab active" data-gender="auto" style="padding:5px 10px;font-size:12px">Auto</button>
            <button class="tab" data-gender="male" style="padding:5px 10px;font-size:12px">Masculino</button>
            <button class="tab" data-gender="female" style="padding:5px 10px;font-size:12px">Feminino</button>
            <span style="font-size:11px;color:var(--faint);margin-left:6px">Idioma:</span>
            <button class="tab active" data-lang="en" style="padding:5px 10px;font-size:12px">English</button>
            <button class="tab" data-lang="pt" style="padding:5px 10px;font-size:12px">Português</button>
          </div>
        </div>

        <div id="tab-upload">
          <div class="dropz" id="dz">
            <input type="file" id="fi" accept=".wav,.mp3,.m4a,.flac,.ogg" />
            <svg style="width:40px;height:40px;margin:0 auto 10px;display:block;opacity:.3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
            </svg>
            <div class="drop-title">Clique ou arraste o arquivo</div>
            <div class="drop-sub">WAV · MP3 · M4A · FLAC</div>
            <div class="drop-file" id="dfName"></div>
          </div>
        </div>

        <div id="tab-url" class="hidden">
          <div class="ig">
            <div>
              <label>URL do arquivo no Supabase</label>
              <input class="tinput" id="supaUrl" type="text" placeholder="https://xxx.supabase.co/storage/v1/object/references/user_001/song.wav" />
            </div>
            <div>
              <label>Anon Key</label>
              <input class="tinput" id="anonKey" type="password" placeholder="eyJhbGci..." />
            </div>
          </div>
        </div>

        <div id="tab-mic" class="hidden">
          <div class="mic-area">
            <div class="mic-row">
              <button class="btn btn-p" id="recBtn">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="8" />
                </svg>Gravar
              </button>
              <div style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--muted)">
                <div class="rdot" id="rDot"></div><span id="rStatus">Pronto</span>
              </div>
              <span class="rtime" id="rTime"></span>
            </div>
            <div class="wave"><canvas id="wCanvas"></canvas></div>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Tab switching
    this.container.querySelectorAll('.tab[data-tab]').forEach(tab => {
      tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab, e.target));
    });

    // Gender selection
    this.container.querySelectorAll('.tab[data-gender]').forEach(btn => {
      btn.addEventListener('click', (e) => this.setGender(e.target.dataset.gender, e.target));
    });

    // Language selection
    this.container.querySelectorAll('.tab[data-lang]').forEach(btn => {
      btn.addEventListener('click', (e) => this.setLanguage(e.target.dataset.lang, e.target));
    });

    // File input
    const fileInput = document.getElementById('fi');
    const dropZone = document.getElementById('dz');
    
    if (fileInput) {
      fileInput.addEventListener('change', (e) => this.onFileSelect(e));
    }

    if (dropZone) {
      dropZone.addEventListener('click', () => fileInput?.click());
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag');
      });
      dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag'));
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag');
        const file = e.dataTransfer.files[0];
        if (file) this.selectFile(file);
      });
    }

    // Record button
    const recBtn = document.getElementById('recBtn');
    if (recBtn) {
      recBtn.addEventListener('click', () => {
        if (typeof window.toggleRec === 'function') {
          window.toggleRec();
        }
      });
    }
  }

  switchTab(tabName, element) {
    this.currentTab = tabName;
    
    // Hide all tabs
    ['upload', 'url', 'mic'].forEach(tab => {
      const tabElement = document.getElementById(`tab-${tab}`);
      if (tabElement) tabElement.classList.toggle('hidden', tab !== tabName);
    });

    // Update active state
    this.container.querySelectorAll('.tab[data-tab]').forEach(tab => {
      tab.classList.remove('active');
    });
    element.classList.add('active');
  }

  setGender(gender, element) {
    this.container.querySelectorAll('.tab[data-gender]').forEach(btn => {
      btn.classList.remove('active');
    });
    element.classList.add('active');
    
    if (typeof window.setGender === 'function') {
      window.setGender(gender, element);
    }
  }

  setLanguage(language, element) {
    this.container.querySelectorAll('.tab[data-lang]').forEach(btn => {
      btn.classList.remove('active');
    });
    element.classList.add('active');
    
    if (typeof window.setLanguage === 'function') {
      window.setLanguage(language, element);
    }
  }

  onFileSelect(event) {
    const file = event.target.files[0];
    if (file) this.selectFile(file);
  }

  selectFile(file) {
    this.selectedFile = file;
    const fileNameElement = document.getElementById('dfName');
    if (fileNameElement) {
      fileNameElement.textContent = file.name;
    }
  }

  getSelectedFile() {
    return this.selectedFile;
  }

  getCurrentTab() {
    return this.currentTab;
  }

  getSupabaseUrl() {
    return document.getElementById('supaUrl')?.value?.trim() || '';
  }

  getAnonKey() {
    return document.getElementById('anonKey')?.value?.trim() || '';
  }
}

window.AudioSource = AudioSource;
