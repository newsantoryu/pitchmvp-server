/**
 * Serviço de comunicação com a API
 */

import { CONFIG } from "../config.js";

fetch(`${CONFIG.API_BASE}${CONFIG.TRANSCRIBE_ENDPOINT}`)

export class ApiService {
  constructor() {
    this.pingTimer = null;
  }

  /**
   * Obtém a URL do servidor configurada
   */
  getServerUrl() {
    return (document.getElementById('sUrl')?.value || '').trim().replace(/\/$/, '');
  }

  /**
   * Verifica se o servidor está online
   */
  async pingServer() {
    clearTimeout(this.pingTimer);
    this.pingTimer = setTimeout(async () => {
      const url = this.getServerUrl();
      const dot = document.getElementById('sDot');

      if (!url) {
        if (dot) dot.className = 'dot';
        return;
      }

      try {
        const response = await fetch(url + '/pitch/health', {
          signal: AbortSignal.timeout(4000),
          headers: { 'ngrok-skip-browser-warning': '1' }
        });

        if (dot) {
          dot.className = response.ok ? 'dot ok' : 'dot err';
        }
      } catch (error) {
        if (dot) dot.className = 'dot err';
      }
    }, 700);
  }

  /**
   * Envia arquivo para análise
   */
  async transcribeFile(file, voiceGender, voiceLanguage) {
    const serverUrl = this.getServerUrl();
    if (!serverUrl) {
      throw new Error('Configure a URL do servidor.');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('voice_gender', voiceGender);
    formData.append('language', voiceLanguage);

    const headers = new Headers();
    headers.append('ngrok-skip-browser-warning', '1');

    const response = await fetch(serverUrl + '/pitch/transcribe-file', {
      method: 'POST',
      headers,
      body: formData
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || 'Erro ' + response.status);
    }

    return await response.json();
  }

  /**
   * Envia URL do Supabase para análise
   */
  async transcribeUrl(audioUrl, anonKey, voiceGender, voiceLanguage) {
    const serverUrl = this.getServerUrl();
    if (!serverUrl) {
      throw new Error('Configure a URL do servidor.');
    }

    if (!audioUrl) {
      throw new Error('Informe a URL do Supabase.');
    }

    const response = await fetch(serverUrl + '/pitch/transcribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': '1'
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        anon_key: anonKey,
        voice_gender: voiceGender,
        language: voiceLanguage
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || 'Erro ' + response.status);
    }

    return await response.json();
  }

  /**
   * Verifica status do job de análise
   */
  async checkJobStatus(jobId) {
    const serverUrl = this.getServerUrl();

    const response = await fetch(serverUrl + '/pitch/job/' + jobId, {
      headers: { 'ngrok-skip-browser-warning': '1' }
    });

    if (!response.ok) {
      throw new Error('Erro ao verificar job.');
    }

    return await response.json();
  }

  /**
   * Carrega lista de cifras salvas
   */
  async loadScores() {
    const serverUrl = this.getServerUrl();
    if (!serverUrl) {
      throw new Error('Configure a URL do servidor.');
    }

    const response = await fetch(serverUrl + '/pitch/scores', {
      headers: { 'ngrok-skip-browser-warning': '1' }
    });

    if (!response.ok) {
      throw new Error('Erro ao carregar cifras.');
    }

    return await response.json();
  }

  /**
   * Carrega uma cifra específica
   */
  async loadScore(id) {
    const serverUrl = this.getServerUrl();
    if (!serverUrl) {
      throw new Error('Configure a URL do servidor.');
    }

    const response = await fetch(serverUrl + '/pitch/scores/' + id, {
      headers: { 'ngrok-skip-browser-warning': '1' }
    });

    if (!response.ok) {
      throw new Error('Cifra não encontrada.');
    }

    return await response.json();
  }

  /**
   * Exclui uma cifra
   */
  async deleteScore(id) {
    const serverUrl = this.getServerUrl();
    if (!serverUrl) {
      throw new Error('Configure a URL do servidor.');
    }

    const response = await fetch(serverUrl + '/pitch/scores/' + id, {
      method: 'DELETE',
      headers: { 'ngrok-skip-browser-warning': '1' }
    });

    if (!response.ok) {
      throw new Error('Erro ao excluir.');
    }

    return true;
  }
}

export const apiService = new ApiService();
