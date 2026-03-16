class ScoresView {
  constructor(container) {
    this.container = container;
    this.render();
    this.bindEvents();
  }

  render() {
    this.container.innerHTML = `
      <div id="scoresView" class="hidden">
        <div class="card">
          <div class="sec-hdr">
            <div class="clabel" style="margin:0">📚 Minhas cifras</div>
            <button class="btn btn-sm" id="backBtn">← Voltar</button>
          </div>
          <div id="scoresList" class="lyrics-wrap"></div>
          <p id="scoresEmpty" class="hidden" style="color:var(--faint);font-size:13px;margin-top:12px">Nenhuma cifra salva ainda. Analise um áudio para salvar.</p>
        </div>
      </div>
    `;
  }

  bindEvents() {
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.hide();
      });
    }
  }

  show() {
    const scoresView = document.getElementById('scoresView');
    if (scoresView) scoresView.classList.remove('hidden');
  }

  hide() {
    const scoresView = document.getElementById('scoresView');
    if (scoresView) scoresView.classList.add('hidden');
    
    // Show main interface
    const mainCard = document.querySelector('.card');
    const controlsRow = document.querySelector('.arow');
    const results = document.getElementById('results');
    
    if (mainCard) mainCard.classList.remove('hidden');
    if (controlsRow) controlsRow.classList.remove('hidden');
    if (results) results.classList.add('hidden');
  }

  async loadScores() {
    const serverUrl = this.getServerUrl();
    if (!serverUrl) {
      if (typeof window.showErr === 'function') {
        window.showErr('Configure a URL do servidor.');
      }
      return;
    }

    try {
      const res = await fetch(serverUrl + '/pitch/scores', {
        headers: { 'ngrok-skip-browser-warning': '1' }
      });
      
      if (!res.ok) throw new Error('Erro ao carregar cifras');
      
      const scores = await res.json();
      this.renderScoresList(scores);
      this.show();
      
    } catch (e) {
      if (typeof window.showErr === 'function') {
        window.showErr(e.message || 'Falha ao carregar Minhas cifras.');
      }
    }
  }

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

  createScoreItem(score) {
    const div = document.createElement('div');
    div.className = 'score-item';
    
    div.innerHTML = `
      <div onclick="window.scoresView.openScore(${score.id})" style="flex:1;cursor:pointer">
        <div class="score-item-title">${this.escapeHtml(score.title || 'Sem título')}</div>
        <div class="score-item-meta">${score.duration != null ? Math.round(score.duration) + 's' : ''} ${score.language ? ' · ' + score.language : ''}</div>
      </div>
      <div class="score-item-actions">
        <span class="score-item-btn" onclick="event.stopPropagation(); window.scoresView.openScore(${score.id})">Ver</span>
        <button type="button" class="btn btn-sm btn-del" onclick="event.stopPropagation(); window.scoresView.deleteScore(${score.id}, this)">Excluir</button>
      </div>
    `;
    
    return div;
  }

  async openScore(id) {
    const serverUrl = this.getServerUrl();
    if (!serverUrl) return;

    try {
      const res = await fetch(serverUrl + '/pitch/scores/' + id, {
        headers: { 'ngrok-skip-browser-warning': '1' }
      });
      
      if (!res.ok) throw new Error('Cifra não encontrada');
      
      const data = await res.json();
      
      // Set result data and show results
      if (typeof window.resultData !== 'undefined') {
        window.resultData = { 
          words: data.words, 
          language: data.language, 
          duration: data.duration 
        };
      }
      
      if (typeof window.render === 'function') {
        window.render(window.resultData);
      }
      
      this.hide();
      
    } catch (e) {
      if (typeof window.showErr === 'function') {
        window.showErr(e.message || 'Falha ao abrir cifra.');
      }
    }
  }

  async deleteScore(id, buttonElement) {
    if (!confirm('Excluir esta cifra? Não é possível desfazer.')) return;
    
    const serverUrl = this.getServerUrl();
    if (!serverUrl) return;

    try {
      const res = await fetch(serverUrl + '/pitch/scores/' + id, {
        method: 'DELETE',
        headers: { 'ngrok-skip-browser-warning': '1' }
      });
      
      if (!res.ok) throw new Error('Erro ao excluir');
      
      const row = buttonElement.closest('.score-item');
      if (row) row.remove();
      
      const listElement = document.getElementById('scoresList');
      const emptyElement = document.getElementById('scoresEmpty');
      
      if (listElement && listElement.children.length === 0 && emptyElement) {
        emptyElement.classList.remove('hidden');
      }
      
    } catch (e) {
      if (typeof window.showErr === 'function') {
        window.showErr(e.message || 'Falha ao excluir cifra.');
      }
    }
  }

  getServerUrl() {
    return (document.getElementById('sUrl')?.value || '').trim().replace(/\/$/, '');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

window.ScoresView = ScoresView;
