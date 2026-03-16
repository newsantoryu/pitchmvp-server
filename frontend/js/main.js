/**
 * Ponto de entrada principal da aplicação
 * Inicializa todos os módulos e configura a aplicação
 */
import { appController } from './app/AppController.js';
import { uiController } from './ui/UIController.js';

/**
 * Classe principal da aplicação
 */
class PitchMVPApp {
  constructor() {
    this.initialized = false;
  }

  /**
   * Inicializa a aplicação
   */
  async initialize() {
    if (this.initialized) return;

    try {
      console.log('Inicializando PitchMVP...');
      
      // Inicializa controladores
      await this.initializeControllers();
      
      // Configura handlers globais
      this.setupGlobalHandlers();
      
      // Inicializa UI
      await this.initializeUI();
      
      this.initialized = true;
      console.log('PitchMVP inicializado com sucesso!');
      
    } catch (error) {
      console.error('Erro ao inicializar PitchMVP:', error);
      this.handleInitializationError(error);
    }
  }

  /**
   * Inicializa controladores
   */
  async initializeControllers() {
    // Controller principal já é inicializado como singleton
    // UI Controller também é singleton
    
    // Verifica se APIs necessárias estão disponíveis
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('API de áudio não suportada neste navegador');
    }
  }

  /**
   * Configura handlers globais
   */
  setupGlobalHandlers() {
    // Tratamento de erros globais
    window.addEventListener('error', (event) => {
      console.error('Erro global:', event.error);
      uiController.showError('Ocorreu um erro inesperado.');
    });

    // Tratamento de promessas rejeitadas
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Promessa rejeitada:', event.reason);
      uiController.showError('Ocorreu um erro na comunicação com o servidor.');
    });

    // Previne fechamento acidental durante gravação
    window.addEventListener('beforeunload', (event) => {
      if (appController.audioService?.isRecording()) {
        event.preventDefault();
        event.returnValue = 'Gravação em andamento. Tem certeza que deseja sair?';
      }
    });
  }

  /**
   * Inicializa UI
   */
  async initializeUI() {
    // Verifica se elementos essenciais existem
    const essentialElements = [
      'sUrl', 'aBtn', 'pWrap', 'errBox', 'results'
    ];

    const missingElements = essentialElements.filter(id => !document.getElementById(id));
    
    if (missingElements.length > 0) {
      console.warn('Elementos essenciais não encontrados:', missingElements);
    }

    // Inicia ping do servidor se URL estiver configurada
    const serverUrl = document.getElementById('sUrl')?.value?.trim();
    if (serverUrl) {
      appController.pingServer();
    }
  }

  /**
   * Trata erros de inicialização
   */
  handleInitializationError(error) {
    console.error('Falha na inicialização:', error);
    
    // Mostra mensagem amigável para o usuário
    const errorElement = document.getElementById('errBox');
    if (errorElement) {
      errorElement.textContent = 'Falha ao inicializar aplicação. Recarregue a página.';
      errorElement.style.display = 'block';
    }
  }

  /**
   * Obtém informações da aplicação
   */
  getInfo() {
    return {
      name: 'PitchMVP',
      version: '2.0.0',
      architecture: 'Modular ES6',
      features: [
        'Transcrição de áudio',
        'Detecção de pitch',
        'Geração de cifras',
        'Análise vocal',
        'Prática de canto'
      ],
      dependencies: [
        'Essentia.js (análise de áudio)',
        'Web Audio API',
        'MediaRecorder API'
      ]
    };
  }

  /**
   * Verifica compatibilidade do navegador
   */
  checkBrowserCompatibility() {
    const requiredFeatures = [
      'mediaDevices',
      'MediaRecorder',
      'AudioContext',
      'fetch',
      'Promise'
    ];

    const missingFeatures = requiredFeatures.filter(feature => {
      return !this.checkFeatureSupport(feature);
    });

    return {
      compatible: missingFeatures.length === 0,
      missingFeatures,
      recommendations: this.getCompatibilityRecommendations(missingFeatures)
    };
  }

  /**
   * Verifica suporte a uma feature específica
   */
  checkFeatureSupport(feature) {
    switch (feature) {
      case 'mediaDevices':
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      case 'MediaRecorder':
        return !!(window.MediaRecorder);
      case 'AudioContext':
        return !!(window.AudioContext || window.webkitAudioContext);
      case 'fetch':
        return !!(window.fetch);
      case 'Promise':
        return !!(window.Promise);
      default:
        return false;
    }
  }

  /**
   * Obtém recomendações de compatibilidade
   */
  getCompatibilityRecommendations(missingFeatures) {
    const recommendations = [];

    if (missingFeatures.includes('mediaDevices') || missingFeatures.includes('MediaRecorder')) {
      recommendations.push('Use um navegador moderno como Chrome, Firefox, Edge ou Safari');
    }

    if (missingFeatures.includes('AudioContext')) {
      recommendations.push('Seu navegador não suporta áudio. Atualize para a versão mais recente');
    }

    if (missingFeatures.includes('fetch')) {
      recommendations.push('Seu navegador é muito antigo. Considere atualizar');
    }

    return recommendations;
  }
}

// Instância global da aplicação
const pitchMVPApp = new PitchMVPApp();

// Exporta como padrão
export default pitchMVPApp;

// Inicializa quando DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => pitchMVPApp.initialize());
} else {
  pitchMVPApp.initialize();
}

// Expõe globalmente para debugging
window.pitchMVPApp = pitchMVPApp;
