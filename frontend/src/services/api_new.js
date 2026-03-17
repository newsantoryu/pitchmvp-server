// Serviço de API - Comunicação com backend Python usando Axios
// API v1 - Versão organizada

import axios from "axios";

// Configuração base da API
const api = axios.create({
  baseURL: "http://localhost:8000/api/v1",
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para tratamento de erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    if (error.code === 'ECONNABORTED') {
      throw new Error('Timeout de conexão');
    }
    if (error.response?.status === 413) {
      throw new Error('Arquivo muito grande (máximo 100MB)');
    }
    if (error.response?.status === 404) {
      throw new Error('Recurso não encontrado');
    }
    if (error.response?.status >= 500) {
      throw new Error('Erro interno do servidor');
    }
    throw error;
  }
);

/**
 * Verifica saúde do servidor
 */
export async function health() {
  const response = await api.get('/pitch/health')
  return response.data
}

/**
 * Envia arquivo para transcrição (batch)
 */
export async function transcribeFile(file, voiceGender = 'auto', language = 'en') {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('voice_gender', voiceGender)
  formData.append('language', language)

  const response = await api.post('/pitch/transcribe-file', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

/**
 * Envia URL para transcrição
 */
export async function transcribeUrl(audioUrl, anonKey, voiceGender = 'auto', language = 'en') {
  const response = await api.post('/pitch/transcribe', {
    audio_url: audioUrl,
    anon_key: anonKey,
    voice_gender: voiceGender,
    language: language
  })
  return response.data
}

/**
 * Obtém status de um job - Timeout específico de 60 segundos
 */
export async function getJobStatus(jobId) {
  const response = await api.get(`/pitch/job/${jobId}`, {
    timeout: 60000 // 60 segundos específico para status checks
  })
  return response.data
}

/**
 * Lista todos os scores
 */
export async function listScores() {
  const response = await api.get('/pitch/scores')
  return response.data
}

/**
 * Obtém um score específico
 */
export async function getScore(scoreId) {
  const response = await api.get(`/pitch/scores/${scoreId}`)
  return response.data
}

/**
 * Atualiza título de um score
 */
export async function updateScore(scoreId, title) {
  const formData = new FormData()
  formData.append('title', title)

  const response = await api.put(`/pitch/scores/${scoreId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

/**
 * Deleta um score
 */
export async function deleteScore(scoreId) {
  const response = await api.delete(`/pitch/scores/${scoreId}`)
  return response.data
}

/**
 * Exporta score em formato JSON
 */
export async function exportScore(scoreId) {
  const response = await api.get(`/pitch/scores/${scoreId}`, {
    headers: {
      'Accept': 'application/json',
    },
  })
  return response.data
}

export default api;
