import { createRouter, createWebHistory } from "vue-router"

// Pages (usando Home-simple que estava funcionando)
import Home from "../pages/Home-simple.vue"
import Upload from "../pages/Upload.vue"
import Scores from "../pages/Scores.vue"
import RealtimePitch from "../pages/RealtimePitch.vue"
import RemotePitch from "../pages/RemotePitch.vue"
import Transcription from "../pages/Transcription.vue"
import Results from "../pages/Results.vue"

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
      path: "/remote-pitch",
      name: "RemotePitch",
      component: RemotePitch,
      meta: {
        title: "Pitch Remoto"
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
