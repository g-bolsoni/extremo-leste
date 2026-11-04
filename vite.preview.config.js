// Build de prévia: um único arquivo HTML, dados de exemplo, sem Firebase e sem service worker.
// Uso: npm run build:preview  (gera dist-preview/extremo-leste-preview.html)
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { fileURLToPath, URL } from 'node:url'

const p = (rel) => fileURLToPath(new URL(rel, import.meta.url))

export default defineConfig({
  plugins: [vue(), viteSingleFile()],
  publicDir: false,
  resolve: {
    alias: [
      { find: 'virtual:pwa-register/vue', replacement: p('./src/preview/pwa-stub.js') },
      { find: '@/services/firebaseDriver', replacement: p('./src/preview/firebase-stub.js') },
      { find: '@', replacement: p('./src') }
    ]
  },
  build: {
    outDir: 'dist-preview',
    emptyOutDir: true
  }
})
