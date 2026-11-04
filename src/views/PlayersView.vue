<script setup>
import { computed, ref } from 'vue'
import { useStore } from '@/composables/useStore'

const { state, isAdmin, savePlayer, removePlayer } = useStore()
const name = ref('')
const nickname = ref('')

// Visitante vê só quem está ativo no time
const visible = computed(() => (isAdmin.value ? state.players : state.players.filter((p) => p.active !== false)))

function add() {
  if (!name.value.trim()) return
  savePlayer({ name: name.value.trim(), nickname: nickname.value.trim(), active: true })
  name.value = ''
  nickname.value = ''
}

const toggleActive = (p) => savePlayer({ id: p.id, active: p.active === false })

function remove(p) {
  if (confirm(`Remover ${p.nickname || p.name}? O histórico dos jogos continua, mas o nome some. Prefira “Inativar”.`)) {
    removePlayer(p.id)
  }
}
</script>

<template>
  <div class="page">
    <form v-if="isAdmin" class="card stack" @submit.prevent="add">
      <p class="section-title">Novo jogador</p>
      <div class="grid2">
        <label class="field"><span>Nome</span><input v-model="name" required /></label>
        <label class="field"><span>Apelido</span><input v-model="nickname" /></label>
      </div>
      <button class="btn">Adicionar</button>
    </form>

    <div v-if="!visible.length" class="empty">Nenhum jogador cadastrado.</div>
    <div v-else class="card">
      <div class="list">
        <div v-for="p in visible" :key="p.id" class="list-item" :style="{ opacity: p.active === false ? 0.5 : 1 }">
          <div class="grow">
            <p>{{ p.nickname || p.name }}</p>
            <p v-if="p.nickname" class="muted">{{ p.name }}</p>
          </div>
          <template v-if="isAdmin">
            <span v-if="p.active === false" class="badge neutral">Inativo</span>
            <button class="btn small secondary" @click="toggleActive(p)">{{ p.active === false ? 'Reativar' : 'Inativar' }}</button>
            <button class="icon-btn" aria-label="Remover" @click="remove(p)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
