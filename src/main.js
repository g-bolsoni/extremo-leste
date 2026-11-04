import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { initStore } from './composables/useStore'
import '@fontsource/anton/latin-400.css'
import '@fontsource/permanent-marker/latin-400.css'
import '@fontsource/barlow/latin-500.css'
import '@fontsource/barlow/latin-600.css'
import '@fontsource/barlow/latin-700.css'
import '@fontsource/rubik-wet-paint/latin-400.css'
import './style.css'

initStore()
createApp(App).use(router).mount('#app')

// Só na prévia: permite testar rotas protegidas por script.
if (import.meta.env.VITE_DEMO) window.__router = router
