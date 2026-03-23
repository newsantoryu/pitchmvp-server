import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './style.css'
import { initializeAPI } from './services/api.js'

async function bootstrap() {
    // Inicializa API com porta dinâmica antes de montar o app
    await initializeAPI()

    // Criar app Vue
    const app = createApp(App)

    // Adicionar Pinia
    app.use(createPinia())

    // Adicionar Router
    app.use(router)

    // Montar app
    app.mount('#app')
}

bootstrap()
