<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/composables/useStore'
import ElLogo from '@/components/ElLogo.vue'

const router = useRouter()
const { state, isAdmin, isLoggedIn, login, logout } = useStore()
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function submit() {
  loading.value = true
  error.value = ''
  try {
    await login(email.value.trim(), password.value)
    // No Firebase a permissão (admin ou não) chega logo depois do login.
    if (state.mode === 'local') router.replace('/')
  } catch {
    error.value = 'E-mail ou senha incorretos.'
  } finally {
    loading.value = false
  }
}

async function signOut() {
  await logout()
  router.replace('/')
}
</script>

<template>
  <div class="page">
    <div class="row" style="justify-content: center"><ElLogo :size="72" /></div>

    <section v-if="isAdmin" class="card stack">
      <p class="match-date">Você é admin</p>
      <p v-if="state.user?.email" class="muted">{{ state.user.email }}</p>
      <p class="muted">Agora aparecem os botões de criar e editar, os pagamentos e a aba Financeiro.</p>
      <RouterLink to="/" class="btn block">Ir para os jogos</RouterLink>
      <button class="btn secondary block" @click="signOut">Sair</button>
    </section>

    <form v-else-if="state.mode === 'firebase'" class="card stack" @submit.prevent="submit">
      <p class="match-date">Área do admin</p>
      <p class="muted">Só administradores editam jogos, campeonatos e pagamentos. Entre com a sua conta.</p>
      <p v-if="isLoggedIn" class="badge danger">Esta conta não tem permissão de admin. Fale com quem administra o app.</p>
      <label class="field"><span>E-mail</span><input v-model="email" type="email" autocomplete="username" required /></label>
      <label class="field"><span>Senha</span><input v-model="password" type="password" autocomplete="current-password" required /></label>
      <p v-if="error" class="badge danger">{{ error }}</p>
      <button class="btn block" :disabled="loading">{{ loading ? 'Entrando…' : 'Entrar' }}</button>
      <button v-if="isLoggedIn" type="button" class="btn secondary block" @click="signOut">Sair desta conta</button>
    </form>

    <section v-else class="card stack">
      <p class="match-date">Modo de teste</p>
      <p class="muted">Sem Firebase não há senha. Este botão só liga a visão de administrador neste aparelho, para você testar.</p>
      <button class="btn block" @click="submit">Entrar como admin</button>
    </section>
  </div>
</template>
