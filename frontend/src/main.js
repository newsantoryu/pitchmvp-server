import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './style.css'

// Criar app Vue
const app = createApp(App)

// Adicionar Pinia
app.use(createPinia())

// Adicionar Router
app.use(router)

// Montar app
app.mount('#app')
