import { createRouter, createWebHistory } from "vue-router"

// Pages (versões simplificadas para garantir funcionamento)
import Home from "../pages/Home-simple.vue"
import Upload from "../pages/Upload-simple.vue"

// Placeholder pages (serão implementadas depois)
const RealtimePitch = { template: '<div class="page"><h1>🎯 Pitch em Tempo Real</h1><p><a href="/">← Voltar</a></p></div>' }
const Transcription = { template: '<div class="page"><h1>🎼 Transcrição</h1><p><a href="/">← Voltar</a></p></div>' }
const Scores = { template: '<div class="page"><h1>📚 Minhas Cifras</h1><p><a href="/">← Voltar</a></p></div>' }
const Results = { template: '<div class="page"><h1>📊 Resultados</h1><p><a href="/">← Voltar</a></p></div>' }

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "Home",
      component: Home,
      meta: {
        title: "PitchMVP - Home"
      }
    },
    {
      path: "/upload",
      name: "Upload",
      component: Upload,
      meta: {
        title: "Upload de Áudio"
      }
    },
    {
      path: "/realtime-pitch",
      name: "RealtimePitch",
      component: RealtimePitch,
      meta: {
        title: "Pitch em Tempo Real"
      }
    },
    {
      path: "/transcription",
      name: "Transcription",
      component: Transcription,
      meta: {
        title: "Transcrição"
      }
    },
    {
      path: "/scores",
      name: "Scores",
      component: Scores,
      meta: {
        title: "Minhas Cifras"
      }
    },
    {
      path: "/results/:id?",
      name: "Results",
      component: Results,
      meta: {
        title: "Resultados"
      }
    },
    // Redirect para home
    {
      path: "/:pathMatch(.*)*",
      redirect: "/"
    }
  ]
})

// Navigation guards
router.beforeEach((to, from, next) => {
  // Update page title
  if (to.meta.title) {
    document.title = to.meta.title
  }
  next()
})

export default router
