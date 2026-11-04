<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { useStore } from '@/composables/useStore'
import ElLogo from '@/components/ElLogo.vue'

const route = useRoute()
const router = useRouter()
const { state, isAdmin, logout, clearError } = useStore()
const { needRefresh, updateServiceWorker } = useRegisterSW()

const isOnline = ref(navigator.onLine)
window.addEventListener('online', () => (isOnline.value = true))
window.addEventListener('offline', () => (isOnline.value = false))

const isDemo = Boolean(import.meta.env.VITE_DEMO)
const previewRole = import.meta.env.VITE_PREVIEW_ROLE || ''
const title = computed(() => route.meta.title || 'Extremo Leste')
const isHome = computed(() => route.name === 'home')
const goBack = () => {
  const back = route.meta.back
  if (back === true) router.back()
  else router.push(back || '/')
}

// Se o login cair (sair, conta sem permissão) numa tela de admin, volta para a home.
watch(isAdmin, (admin) => {
  if (!admin && route.matched.some((r) => r.meta.admin)) router.replace('/')
})

async function signOut() {
  await logout()
  router.replace('/')
}
</script>

<template>
  <!-- Filtro "pincel": deixa a borda das letras irregular, como tinta/spray -->
  <svg width="0" height="0" style="position: absolute" aria-hidden="true">
    <filter id="rough" x="-5%" y="-8%" width="110%" height="116%">
      <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="3" seed="4" result="n" />
      <feDisplacementMap in="SourceGraphic" in2="n" scale="5" />
    </filter>
  </svg>

  <div v-if="!state.authReady" class="spinner" />
  <div v-else class="app">
    <header class="topbar">
      <button v-if="route.meta.back" class="icon-btn" aria-label="Voltar" @click="goBack">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <ElLogo v-else :size="38" />
      <h1>
        {{ title }}
        <span v-if="isHome" class="sub">Da quebrada pro mundo!</span>
      </h1>
      <template v-if="isAdmin">
        <span class="badge-admin">Admin</span>
        <button class="icon-btn" aria-label="Sair" @click="signOut">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
        </button>
      </template>
      <!-- Visitante: nenhum link para o login. A tela de admin só abre digitando /admin na URL. -->
    </header>

    <div v-if="!isOnline" class="banner">Sem internet — mudanças serão sincronizadas quando voltar.</div>
    <div v-if="state.mode === 'local'" class="banner">
      <!-- Faixas que existem só nas builds de prévia / modo local -->
      <template v-if="previewRole === 'public'">Prévia da área pública: visitante, sem login. Dados de exemplo.</template>
      <template v-else-if="previewRole === 'admin'">
        Prévia da área privada: admin logado. Dados de exemplo.
        <RouterLink v-if="!isAdmin" to="/admin">Entrar de novo</RouterLink>
      </template>
      <template v-else-if="isDemo">
        Prévia com dados de exemplo.
        <RouterLink to="/admin">Abrir tela de admin</RouterLink>
      </template>
      <template v-else>Modo local: os dados ficam só neste aparelho. Configure o Firebase para compartilhar com o time.</template>
    </div>

    <div v-if="!state.ready" class="spinner" />
    <RouterView v-else />

    <nav class="bottom-nav">
      <div class="inner">
        <RouterLink to="/" exact-active-class="router-link-active" :class="{ 'router-link-active': route.path.startsWith('/jogo') }">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7l4 3-1.5 5h-5L8 10z" /></svg>
          Jogos
        </RouterLink>
        <RouterLink to="/campeonatos" :class="{ 'router-link-active': route.path.startsWith('/campeonato') }">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" /></svg>
          Campeonatos
        </RouterLink>
        <RouterLink v-if="isAdmin" to="/financeiro">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></svg>
          Financeiro
        </RouterLink>
        <RouterLink to="/jogadores">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2 .6 3.5 2.5 3.5 5.5" /></svg>
          Jogadores
        </RouterLink>
      </div>
    </nav>

    <div v-if="needRefresh" class="toast">
      <span class="grow">Nova versão disponível.</span>
      <button @click="updateServiceWorker(true)">Atualizar</button>
    </div>
    <div v-else-if="state.error" class="toast">
      <span class="grow">{{ state.error }}</span>
      <button @click="clearError">OK</button>
    </div>
  </div>
</template>
