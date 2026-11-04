// Substitui o "virtual:pwa-register/vue" na build de prévia (sem service worker).
import { ref } from 'vue'

export function useRegisterSW() {
  return { needRefresh: ref(false), offlineReady: ref(false), updateServiceWorker: async () => {} }
}
