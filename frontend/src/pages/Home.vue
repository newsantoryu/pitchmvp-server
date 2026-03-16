<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePitchStore } from '../stores/pitchStore.js'
import { useTranscriptionStore } from '../stores/transcriptionStore.js'

const router = useRouter()
const pitchStore = usePitchStore()
const transcriptionStore = useTranscriptionStore()

onMounted(() => {
  console.log('🏠 Home page montada')
  // Reset stores ao entrar na home
  pitchStore.reset()
  transcriptionStore.reset()
})

function navigateToUpload() {
  router.push('/upload')
}

function navigateToRealtime() {
  router.push('/realtime-pitch')
}

function navigateToTranscription() {
  router.push('/transcription')
}

function navigateToScores() {
  router.push('/scores')
}
</script>

<template>
  <div class="home-page">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-content">
        <h1 class="hero-title">
          🎵 <span class="gradient-text">PitchMVP</span>
        </h1>
        <p class="hero-subtitle">
          Sistema avançado de detecção de pitch e transcrição musical
        </p>
        <div class="hero-stats">
          <div class="stat-item">
            <span class="stat-number">3</span>
            <span class="stat-label">Modos</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">∞</span>
            <span class="stat-label">Análises</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">100%</span>
            <span class="stat-label">Precisão</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Grid -->
    <section class="features">
      <h2 class="section-title">🚀 Comece agora</h2>
      <div class="features-grid">
        <!-- Upload Feature -->
        <div class="feature-card" @click="navigateToUpload">
          <div class="feature-icon">📁</div>
          <h3 class="feature-title">Upload de Áudio</h3>
          <p class="feature-description">
            Envie arquivos MP3, WAV ou M4A para análise completa
          </p>
          <div class="feature-actions">
            <span class="action-text">Upload →</span>
          </div>
        </div>

        <!-- Realtime Pitch -->
        <div class="feature-card" @click="navigateToRealtime">
          <div class="feature-icon">🎯</div>
          <h3 class="feature-title">Pitch em Tempo Real</h3>
          <p class="feature-description">
            Detecção ao vivo de notas musicais com Essentia.js
          </p>
          <div class="feature-actions">
            <span class="action-text">Detectar →</span>
          </div>
        </div>

        <!-- Transcription -->
        <div class="feature-card" @click="navigateToTranscription">
          <div class="feature-icon">🎼</div>
          <h3 class="feature-title">Transcrição</h3>
          <p class="feature-description">
            Transcrição completa com cifras e partituras
          </p>
          <div class="feature-actions">
            <span class="action-text">Transcrever →</span>
          </div>
        </div>

        <!-- Scores -->
        <div class="feature-card" @click="navigateToScores">
          <div class="feature-icon">📚</div>
          <h3 class="feature-title">Minhas Cifras</h3>
          <p class="feature-description">
            Visualize e gerencie suas transcrições salvas
          </p>
          <div class="feature-actions">
            <span class="action-text">Ver Cifras →</span>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works -->
    <section class="how-it-works">
      <h2 class="section-title">🔄 Como funciona</h2>
      <div class="steps">
        <div class="step">
          <div class="step-number">1</div>
          <div class="step-content">
            <h3>Escolha o modo</h3>
            <p>Upload, gravação ou tempo real</p>
          </div>
        </div>
        <div class="step">
          <div class="step-number">2</div>
          <div class="step-content">
            <h3>Forneça o áudio</h3>
            <p>Arquivo, microfone ou URL</p>
          </div>
        </div>
        <div class="step">
          <div class="step-number">3</div>
          <div class="step-content">
            <h3>Processamento</h3>
            <p>Análise com IA e algoritmos avançados</p>
          </div>
        </div>
        <div class="step">
          <div class="step-number">4</div>
          <div class="step-content">
            <h3>Resultado</h3>
            <p>Notas, cifras e partituras</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Tech Stack -->
    <section class="tech-stack">
      <h2 class="section-title">⚡ Tecnologia</h2>
      <div class="tech-grid">
        <div class="tech-item">
          <span class="tech-icon">🎵</span>
          <span class="tech-name">Essentia.js</span>
        </div>
        <div class="tech-item">
          <span class="tech-icon">🐍</span>
          <span class="tech-name">Python FastAPI</span>
        </div>
        <div class="tech-item">
          <span class="tech-icon">🟢</span>
          <span class="tech-name">Vue 3</span>
        </div>
        <div class="tech-item">
          <span class="tech-icon">⚡</span>
          <span class="tech-name">Vite</span>
        </div>
        <div class="tech-item">
          <span class="tech-icon">🎯</span>
          <span class="tech-name">Web Audio API</span>
        </div>
        <div class="tech-item">
          <span class="tech-icon">🤖</span>
          <span class="tech-name">Machine Learning</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.hero {
  padding: 4rem 2rem;
  text-align: center;
  color: white;
}

.hero-content {
  max-width: 800px;
  margin: 0 auto;
}

.hero-title {
  font-size: 4rem;
  font-weight: 800;
  margin-bottom: 1rem;
  line-height: 1.1;
}

.gradient-text {
  background: linear-gradient(135deg, #ffd700, #ffed4e);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 1.3rem;
  margin-bottom: 3rem;
  opacity: 0.9;
}

.hero-stats {
  display: flex;
  justify-content: center;
  gap: 3rem;
  flex-wrap: wrap;
}

.stat-item {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 2.5rem;
  font-weight: 700;
  color: #ffd700;
}

.stat-label {
  font-size: 0.9rem;
  opacity: 0.8;
}

.features {
  padding: 4rem 2rem;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
}

.section-title {
  text-align: center;
  font-size: 2.5rem;
  margin-bottom: 3rem;
  color: #333;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.feature-card {
  background: white;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.feature-title {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: #333;
}

.feature-description {
  color: #666;
  margin-bottom: 1.5rem;
  line-height: 1.6;
}

.feature-actions {
  color: #2196f3;
  font-weight: 600;
}

.how-it-works {
  padding: 4rem 2rem;
  background: rgba(255, 255, 255, 0.9);
}

.steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.step-number {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #2196f3, #4caf50);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.step-content h3 {
  margin-bottom: 0.5rem;
  color: #333;
}

.step-content p {
  color: #666;
  font-size: 0.9rem;
}

.tech-stack {
  padding: 4rem 2rem;
  background: rgba(255, 255, 255, 0.95);
}

.tech-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1.5rem;
  max-width: 800px;
  margin: 0 auto;
}

.tech-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.tech-icon {
  font-size: 1.5rem;
}

.tech-name {
  font-weight: 600;
  color: #333;
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2.5rem;
  }
  
  .hero-subtitle {
    font-size: 1.1rem;
  }
  
  .hero-stats {
    gap: 1.5rem;
  }
  
  .stat-number {
    font-size: 2rem;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .steps {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .tech-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
