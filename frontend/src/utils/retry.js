/**
 * Utilitário de Retry Automático
 * Implementa retry com delay exponencial para operações assíncronas
 */

/**
 * Função de retry com delay exponencial
 * @param {Function} fn - Função assíncrona para executar
 * @param {number} retries - Número máximo de tentativas (padrão: 2)
 * @param {number} delay - Delay inicial em ms (padrão: 1000)
 * @param {Function} shouldRetry - Função para determinar se deve retry (opcional)
 * @returns {Promise} Resultado da função ou erro final
 */
export async function retry(fn, retries = 2, delay = 1000, shouldRetry = null) {
  try {
    return await fn()
  } catch (error) {
    // Se não há mais tentativas, lança o erro
    if (retries === 0) {
      console.error(`❌ Retry falhou após todas as tentativas:`, error.message)
      throw error
    }
    
    // Verifica se deve retry com função personalizada
    if (shouldRetry && !shouldRetry(error)) {
      console.warn(`⚠️ Retry cancelado pela condição shouldRetry:`, error.message)
      throw error
    }
    
    // Verifica se é um erro que não deve fazer retry
    if (!shouldRetry && !isRetryableError(error)) {
      console.warn(`⚠️ Erro não retryável:`, error.message)
      throw error
    }
    
    // Log da tentativa de retry
    console.warn(`🔄 Retry ${retries} tentativas restantes - Erro: ${error.message}`)
    
    // Delay exponencial
    const delayWithBackoff = delay * Math.pow(2, 2 - retries)
    await new Promise(resolve => setTimeout(resolve, delayWithBackoff))
    
    // Tentar novamente
    return retry(fn, retries - 1, delay, shouldRetry)
  }
}

/**
 * Verifica se o erro é retryável
 * @param {Error} error - Erro capturado
 * @returns {boolean} True se o erro é retryável
 */
function isRetryableError(error) {
  // Erros de rede e timeout são retryáveis
  const retryableErrors = [
    'NETWORK_ERROR',
    'TIMEOUT',
    'CONNECTION_RESET',
    'ECONNRESET',
    'ECONNABORTED',
    'ETIMEDOUT'
  ]
  
  // Verificar se o código do erro está na lista
  if (error.code && retryableErrors.includes(error.code)) {
    return true
  }
  
  // Verificar se a mensagem contém palavras-chave de retry
  const retryableKeywords = [
    'network',
    'timeout',
    'connection',
    'temporary',
    'unavailable'
  ]
  
  const errorMessage = error.message.toLowerCase()
  return retryableKeywords.some(keyword => errorMessage.includes(keyword))
}

/**
 * Retry com jitter para evitar thundering herd
 * @param {Function} fn - Função assíncrona
 * @param {number} retries - Número de tentativas
 * @param {number} baseDelay - Delay base em ms
 * @returns {Promise} Resultado da função
 */
export async function retryWithJitter(fn, retries = 2, baseDelay = 1000) {
  try {
    return await fn()
  } catch (error) {
    if (retries === 0) throw error
    
    if (!isRetryableError(error)) {
      throw error
    }
    
    // Adicionar jitter aleatório (±25%)
    const jitter = 0.25 * baseDelay * (Math.random() * 2 - 1)
    const delayWithJitter = baseDelay + jitter
    
    console.warn(`🔄 Retry com jitter (${delayWithJitter.toFixed(0)}ms): ${error.message}`)
    
    await new Promise(resolve => setTimeout(resolve, delayWithJitter))
    return retryWithJitter(fn, retries - 1, baseDelay * 2)
  }
}

/**
 * Configurações de retry por tipo de operação
 */
export const RETRY_CONFIG = {
  // Operações de rede - retry agressivo
  NETWORK: {
    retries: 3,
    delay: 1000,
    shouldRetry: (error) => isRetryableError(error)
  },
  
  // Operações de microfone - retry conservador
  MICROPHONE: {
    retries: 2,
    delay: 500,
    shouldRetry: (error) => error.name === 'NotAllowedError' || error.name === 'NotFoundError'
  },
  
  // Operações de API - retry moderado
  API: {
    retries: 2,
    delay: 1500,
    shouldRetry: (error) => isRetryableError(error)
  },
  
  // Operações de inicialização - retry rápido
  INITIALIZATION: {
    retries: 3,
    delay: 300,
    shouldRetry: (error) => !error.message.includes('permission')
  }
}

/**
 * Retry com configuração pré-definida
 * @param {Function} fn - Função assíncrona
 * @param {string} configType - Tipo de configuração (NETWORK, MICROPHONE, API, INITIALIZATION)
 * @returns {Promise} Resultado da função
 */
export async function retryWithConfig(fn, configType = 'API') {
  const config = RETRY_CONFIG[configType] || RETRY_CONFIG.API
  return retry(fn, config.retries, config.delay, config.shouldRetry)
}
