// Serviço de API - Comunicação com backend Python
// Migrado dos endpoints: app/routes_pitch_realtime.js

const API_BASE = "http://localhost:8000"

/**
 * Verifica saúde do servidor
 */
export async function health() {
  const response = await fetch(`${API_BASE}/health`)
  if (!response.ok) throw new Error('Erro ao verificar saúde do servidor')
  return response.json()
}

/**
 * Envia arquivo para transcrição (batch)
 */
export async function transcribeFile(file, voiceGender = 'auto', language = 'pt') {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('voice_gender', voiceGender)

  const response = await fetch(`${API_BASE}/pitch/transcribe-file`, {
    method: 'POST',
    body: formData
  })

  if (!response.ok) throw new Error('Erro ao enviar arquivo')
  return response.json()
}

/**
 * Envia URL para transcrição
 */
export async function transcribeUrl(audioUrl, anonKey, voiceGender = 'auto', language = 'pt') {
  const response = await fetch(`${API_BASE}/pitch/transcribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      anon_key: anonKey,
      voice_gender: voiceGender,
      language: language
    })
  })

  if (!response.ok) throw new Error('Erro ao enviar URL')
  return response.json()
}

/**
 * Obtém status de um job
 */
export async function getJobStatus(jobId) {
  const response = await fetch(`${API_BASE}/pitch/job/${jobId}`)
  if (!response.ok) throw new Error('Erro ao obter status do job')
  return response.json()
}

/**
 * Carrega lista de cifras salvas
 */
export async function loadScores() {
  const response = await fetch(`${API_BASE}/pitch/scores`)
  if (!response.ok) throw new Error('Erro ao carregar cifras')
  return response.json()
}

/**
 * Obtém uma cifra específica
 */
export async function getScore(scoreId) {
  const response = await fetch(`${API_BASE}/pitch/scores/${scoreId}`)
  if (!response.ok) throw new Error('Erro ao obter cifra')
  return response.json()
}

/**
 * Deleta uma cifra
 */
export async function deleteScore(scoreId) {
  const response = await fetch(`${API_BASE}/pitch/scores/${scoreId}`, {
    method: 'DELETE'
  })
  if (!response.ok) throw new Error('Erro ao deletar cifra')
  return response.json()
}

/**
 * Exporta cifra em PDF
 */
export async function exportPDF(scoreId) {
  const response = await fetch(`${API_BASE}/pitch/scores/${scoreId}/pdf`)
  if (!response.ok) throw new Error('Erro ao exportar PDF')
  return response.blob()
}

/**
 * Envia frame de áudio para detecção em tempo real
 * Migrado de: app/routes_pitch_realtime.js
 */
export async function transcribeFrame(samples, sampleRate = 44100) {
  const response = await fetch(`${API_BASE}/pitch/transcribe-frame-json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      samples: samples,
      sample_rate: sampleRate
    })
  })

  if (!response.ok) throw new Error('Erro ao processar frame')
  return response.json()
}

/**
 * Envia arquivo para processamento em tempo real
 */
export async function transcribeRealtimeFile(file, voiceGender = 'auto') {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('voice_gender', voiceGender)

  const response = await fetch(`${API_BASE}/pitch/transcribe-file`, {
    method: 'POST',
    body: formData
  })

  if (!response.ok) throw new Error('Erro ao enviar arquivo')
  return response.json()
}

/**
 * Verifica saúde do serviço de realtime
 */
export async function realtimeHealth() {
  const response = await fetch(`${API_BASE}/pitch/health`)
  if (!response.ok) throw new Error('Erro ao verificar saúde do realtime')
  return response.json()
}

/**
 * Obtém métricas do sistema
 */
export async function getMetrics() {
  const response = await fetch(`${API_BASE}/pitch/metrics`)
  if (!response.ok) throw new Error('Erro ao obter métricas')
  return response.json()
}

/**
 * Envia feedback sobre transcrição
 */
export async function sendFeedback(jobId, feedback) {
  const response = await fetch(`${API_BASE}/pitch/job/${jobId}/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(feedback)
  })

  if (!response.ok) throw new Error('Erro ao enviar feedback')
  return response.json()
}

/**
 * Obtém estatísticas do usuário
 */
export async function getUserStats() {
  const response = await fetch(`${API_BASE}/pitch/stats`)
  if (!response.ok) throw new Error('Erro ao obter estatísticas')
  return response.json()
}

/**
 * Classe para gerenciar polling de jobs
 */
export class JobPoller {
  constructor(jobId, onUpdate, onComplete, onError) {
    this.jobId = jobId
    this.onUpdate = onUpdate
    this.onComplete = onComplete
    this.onError = onError
    this.pollInterval = null
    this.maxAttempts = 120 // 2 minutos com polling a cada 1s
    this.attempts = 0
  }

  async start() {
    this.attempts = 0
    this.poll()
  }

  async poll() {
    if (this.attempts >= this.maxAttempts) {
      this.onError(new Error('Timeout ao processar job'))
      this.stop()
      return
    }

    try {
      const job = await getJobStatus(this.jobId)
      this.attempts++

      if (this.onUpdate) {
        this.onUpdate(job)
      }

      if (job.status === 'done') {
        this.onComplete(job)
        this.stop()
      } else if (job.status === 'error') {
        this.onError(new Error(job.error || 'Erro no processamento'))
        this.stop()
      } else {
        // Continua polling
        this.pollInterval = setTimeout(() => this.poll(), 1000)
      }

    } catch (error) {
      this.onError(error)
      this.stop()
    }
  }

  stop() {
    if (this.pollInterval) {
      clearTimeout(this.pollInterval)
      this.pollInterval = null
    }
  }
}

/**
 * Utilitário para criar upload de arquivo com progresso
 */
export function createFileUpload(file, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)

    const xhr = new XMLHttpRequest()

    // Progress
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100
          onProgress(progress)
        }
      })
    }

    // Completion
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText)
          resolve(response)
        } catch (error) {
          reject(error)
        }
      } else {
        reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`))
      }
    })

    // Error
    xhr.addEventListener('error', () => {
      reject(new Error('Erro de rede'))
    })

    xhr.open('POST', `${API_BASE}/pitch/transcribe-file`)
    xhr.send(formData)
  })
}
