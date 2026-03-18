// pitchService.js - Camada de serviço de negócio para operações de pitch
// Abstrai operações específicas sobre a camada de API

import {
  transcribeFile,
  getJobStatus,
  listScores,
  getScore,
  deleteScore,
  updateScore
} from './api.js'

/**
 * Envia arquivo de áudio para processamento de pitch
 * @param {File} file - Arquivo de áudio
 * @param {Object} options - Opções de processamento
 * @param {string} options.voiceGender - Gênero vocal ('auto', 'male', 'female')
 * @param {string} options.language - Idioma ('en', 'pt', 'es')
 * @returns {Object} - Job criado
 */
export async function sendAudio(file, options = {}) {
  const { voiceGender = 'auto', language = 'en' } = options

  const response = await transcribeFile(file, voiceGender, language)
  return response
}

/**
 * Envia áudio e aguarda processamento completo com polling
 * @param {File} file - Arquivo de áudio
 * @param {Object} options - Opções de processamento
 * @returns {Object} - Resultado final do processamento
 */
export async function sendAudioAndWait(file, options = {}) {
  const job = await sendAudio(file, options)

  // Polling até completar ou erro
  let status = await getJobStatus(job.job_id)
  const maxAttempts = 120 // 2 minutos máximo
  let attempts = 0

  while ((status.status === 'processing' || status.status === 'queued') && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000))
    status = await getJobStatus(job.job_id)
    attempts++
  }

  if (attempts >= maxAttempts) {
    throw new Error('Timeout ao processar áudio')
  }

  return status
}

/**
 * Envia arquivo para transcrição e aguarda com timeout específico de 40 minutos
 * @param {File} file - Arquivo de áudio
 * @param {Object} options - Opções de processamento
 * @returns {Object} - Resultado final do processamento
 */
export async function sendTranscribeFileAndWait(file, options = {}) {
  const { voiceGender = 'auto', language = 'en' } = options

  // Envia arquivo com timeout de 40 minutos
  const job = await transcribeFile(file, voiceGender, language)

  // Polling com timeout de 40 minutos específico para transcribe-file
  const startTime = Date.now()
  const maxDuration = 2400 * 1000 // 40 minutos em milissegundos

  let status = await getJobStatus(job.job_id)

  while (status.status === 'processing' || status.status === 'queued') {
    // Verificar timeout de 40 minutos
    if (Date.now() - startTime > maxDuration) {
      throw new Error('Timeout no processamento (40 minutos para transcribe-file)')
    }

    await new Promise(resolve => setTimeout(resolve, 1000))
    status = await getJobStatus(job.job_id)
  }

  if (status.status === 'error') {
    throw new Error(status.error || 'Erro no processamento')
  }

  return status
}

/**
 * Obtém todas as transcrições (scores)
 * @returns {Array} - Lista de transcrições
 */
export async function getAllTranscriptions() {
  const scores = await listScores()
  return scores
}

/**
 * Obtém transcrição específica com notas
 * @param {string} scoreId - ID da transcrição
 * @returns {Object} - Transcrição completa
 */
export async function getTranscription(scoreId) {
  const score = await getScore(scoreId)
  return score
}

/**
 * Processa áudio e retorna notas formatadas
 * @param {File} file - Arquivo de áudio
 * @param {Object} options - Opções de processamento
 * @returns {Object} - Resultado formatado com notas
 */
export async function processAudio(file, options = {}) {
  const result = await sendAudioAndWait(file, options)

  if (result.status === 'done') {
    return {
      success: true,
      notes: result.transcription?.words || [],
      metadata: result.transcription,
      job_id: result.job_id
    }
  } else {
    throw new Error(result.error || 'Erro ao processar áudio')
  }
}

/**
 * Deleta uma transcrição
 * @param {string} scoreId - ID da transcrição
 * @returns {Object} - Resultado da deleção
 */
export async function deleteTranscription(scoreId) {
  const result = await deleteScore(scoreId)
  return result
}

/**
 * Atualiza título de uma transcrição
 * @param {string} scoreId - ID da transcrição
 * @param {string} title - Novo título
 * @returns {Object} - Resultado da atualização
 */
export async function updateTranscriptionTitle(scoreId, title) {
  const result = await updateScore(scoreId, title)
  return result
}

/**
 * Verifica status de um job de processamento
 * @param {string} jobId - ID do job
 * @returns {Object} - Status atual do job
 */
export async function checkJobStatus(jobId) {
  const status = await getJobStatus(jobId)
  return status
}

/**
 * Obtém estatísticas das transcrições
 * @returns {Object} - Estatísticas gerais
 */
export async function getTranscriptionStats() {
  const scores = await getAllTranscriptions()

  return {
    total: scores.length,
    completed: scores.filter(s => s.status === 'done').length,
    processing: scores.filter(s => s.status === 'processing').length,
    failed: scores.filter(s => s.status === 'error').length,
    averageDuration: scores.reduce((acc, s) => acc + (s.duration || 0), 0) / scores.length || 0
  }
}

// Exportar getScore para uso em outros módulos
export { getScore }
