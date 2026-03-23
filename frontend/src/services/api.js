// Serviço de API - Comunicação com backend Python usando Axios
// API v1 - Versão organizada

import axios from 'axios'
import { retryWithConfig } from '../utils/retry.js'

// Configuração base da API
let currentBaseURL = "http://localhost:8000/api/v1";

let api = axios.create({
  baseURL: currentBaseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Descobre porta dinâmica do backend
 * Procura servidor nas portas 8000-8010 (mesmo range do start.sh)
 */
async function discoverBackendPort(startPort = 8000, endPort = 8010) {
  console.log('🔍 Procurando backend nas portas', startPort, '-', endPort);

  for (let port = startPort; port <= endPort; port++) {
    try {
      const healthUrl = `http://localhost:${port}/api/v1/pitch/health`;
      const response = await axios.get(healthUrl, { timeout: 2000 });

      if (response.status === 200) {
        console.log(`✅ Backend encontrado na porta ${port}`);
        return port;
      }
    } catch (error) {
      // Porta não respondeu, tentar próxima
      continue;
    }
  }

  console.warn('⚠️ Backend não encontrado, usando porta padrão 8000');
  return 8000;
}

/**
 * Inicializa API com porta dinâmica
 * Deve ser chamado no startup da aplicação
 */
export async function initializeAPI() {
  const port = await discoverBackendPort();
  const newBaseURL = `http://localhost:${port}/api/v1`;

  if (newBaseURL !== currentBaseURL) {
    console.log(`🔄 Atualizando API baseURL: ${currentBaseURL} → ${newBaseURL}`);
    currentBaseURL = newBaseURL;
    api.defaults.baseURL = newBaseURL;
  }

  return { port, baseURL: newBaseURL };
}

api.interceptors.request.use(
  (config) => {
    const timeoutMs = config.timeout || 30000; // Default global
    console.log(`🔍 DEBUG: ${config.method?.toUpperCase()} ${config.url}`);
    console.log(`🔍 DEBUG: Timeout configurado: ${timeoutMs}ms (${timeoutMs / 1000}s)`);
    console.log(`🔍 DEBUG: Headers:`, config.headers);
    console.log(`🔍 DEBUG: Timestamp: ${new Date().toISOString()}`);

    // Cache busting para job status
    if (config.url?.includes('/job/')) {
      config.params = {
        ...config.params,
        _cb: Date.now() // Força cache busting
      };
    }

    return config;
  },
  (error) => {
    console.error('🔍 Request Error:', error);
    return Promise.reject(error);
  }
);

// Interceptor para tratamento de erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);

    // Preservar timeouts específicos já tratados
    if (error.code === 'ECONNABORTED') {
      if (error.isUploadTimeout) {
        throw error; // Mantém mensagem específica de upload
      }
      if (error.isPollingTimeout) {
        throw error; // Mantém mensagem específica de polling
      }
      // Só usa mensagem genérica se não for específico
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
 * Envia arquivo para transcrição (batch) - Timeout específico de 40 minutos
 */
export async function transcribeFile(file, voiceGender = 'auto', language = 'en') {
  console.log(`📤 Iniciando upload: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

  const formData = new FormData()
  formData.append('file', file)
  formData.append('voice_gender', voiceGender)
  formData.append('language', language)

  try {
    const response = await api.post('/pitch/transcribe-file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 2400000, // 40 minutos em milissegundos (apenas esta rota)
    })
    console.log(`✅ Upload concluído: ${file.name}`);
    return response.data
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.error(`⏰ Timeout no upload após 40min: ${file.name}`);
      const timeoutError = new Error('Timeout no upload (40 minutos máximo para transcribe-file)');
      timeoutError.code = 'ECONNABORTED';
      timeoutError.isUploadTimeout = true;
      throw timeoutError;
    }
    console.error(`❌ Erro no upload: ${file.name}`, error);
    throw error
  }
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
 * Obtém status de um job - Timeout específico de 300 segundos (5 minutos) para polling
 */
export async function getJobStatus(jobId) {
  console.log(`🔍 getJobStatus chamado para jobId: ${jobId}`);

  return await retryWithConfig(async () => {
    try {
      // Sem timeout - deixar o backend responder quando precisar
      const response = await api.get(`/pitch/job/${jobId}`, {
        timeout: 0, // Sem timeout - espera indefinidamente
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      console.log(`🔍 getJobStatus response:`, response.data);
      return response.data;

    } catch (error) {
      console.error(`🔍 getJobStatus error message:`, error.message);

      // Tratar erros de rede, mas não timeout
      if (error.code === 'ECONNABORTED') {
        console.error(`⏰ Conexão interrompida no job ${jobId} - tentando novamente...`);
        const retryError = new Error('Conexão interrompida, tentando novamente...');
        retryError.code = 'ECONNABORTED';
        retryError.isRetryable = true;
        throw retryError;
      }
      throw error
    }
  }, 'API')
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
  return await retryWithConfig(async () => {
    const response = await api.get(`/pitch/scores/${scoreId}`)
    return response.data
  }, 'API')
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

/**
 * Envia frame de áudio para detecção em tempo real
 */
export async function transcribeFrame(samples, sampleRate = 44100) {
  const response = await api.post('/pitch-realtime/transcribe-frame-json', {
    samples: samples,
    sample_rate: sampleRate
  })
  return response.data
}

/**
 * Envia arquivo para processamento em tempo real
 */
export async function transcribeRealtimeFile(file, voiceGender = 'auto', language = 'pt') {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('voice_gender', voiceGender)
  formData.append('language', language)

  const response = await api.post('/pitch-realtime/transcribe-file', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

/**
 * Verifica saúde do serviço de realtime
 */
export async function realtimeHealth() {
  const response = await api.get('/pitch-realtime/health')
  return response.data
}

export default api;
