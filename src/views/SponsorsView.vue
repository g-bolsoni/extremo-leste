<script setup>
import { computed, ref } from 'vue'
import { useStore } from '@/composables/useStore'
import { brl } from '@/utils/format'
import { PURPOSES, sponsorSummary, sponsorsTotals } from '@/utils/finance'
import SponsorTile from '@/components/SponsorTile.vue'

const { state, isAdmin } = useStore()
const filter = ref('todos')

// Visitante recebe só os ativos (o store já filtra); admin vê todos, inclusive inativos.
const all = computed(() => state.sponsors)
const available = computed(() => Object.keys(PURPOSES).filter((k) => all.value.some((s) => s.supports?.[k])))
const shown = computed(() => {
  const list = filter.value === 'todos' ? all.value : all.value.filter((s) => s.supports?.[filter.value])
  // destaques primeiro, depois por nome
  return [...list].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || (a.name || '').localeCompare(b.name || '', 'pt-BR'))
})

// Só admin: quanto cada um já ajudou
const totals = computed(() => (isAdmin.value ? sponsorsTotals(all.value) : null))
const given = (s) => sponsorSummary(s).total
</script>

<template>
  <div class="page">
    <header class="sponsor-hero">
      <p class="tag">Gente da quebrada que bota fé</p>
      <h2 class="brush">
        <span class="w">QUEM BANCA</span>
        <span class="r">O TIME</span>
      </h2>
      <p class="muted">Os parceiros que ajudam o Extremo Leste com campeonatos, uniforme e o dia a dia.</p>
    </header>

    <!-- Só admin: resumo do que entrou, por destino -->
    <section v-if="isAdmin && totals" class="card stack">
      <p class="section-title">Patrocínio recebido</p>
      <p class="score">{{ brl(totals.total) }}</p>
      <div class="grid3">
        <div v-for="(label, key) in PURPOSES" :key="key">
          <p class="muted">{{ label }}</p>
          <p><strong>{{ brl(totals.byPurpose[key]) }}</strong></p>
        </div>
      </div>
    </section>

    <div v-if="available.length > 1" class="chips" role="tablist">
      <button :class="{ active: filter === 'todos' }" @click="filter = 'todos'">Todos ({{ all.length }})</button>
      <button
        v-for="k in available"
        :key="k"
        :class="{ active: filter === k }"
        @click="filter = k"
      >{{ PURPOSES[k] }}</button>
    </div>

    <div v-if="!shown.length" class="empty">
      <span class="marker">Ainda sem parceiros por aqui.</span>
      <p v-if="isAdmin">Toque em “Novo patrocinador” para cadastrar o primeiro.</p>
      <p v-else>Quando o time ganhar apoio, os parceiros aparecem aqui.</p>
    </div>

    <div v-else class="sponsor-grid">
      <div v-for="s in shown" :key="s.id" class="sponsor-cell" :class="{ wide: s.featured, off: s.active === false }">
        <SponsorTile :sponsor="s" :size="s.featured ? 'lg' : 'md'" />
        <!-- Só admin: valores e edição -->
        <div v-if="isAdmin" class="admin-row">
          <span v-if="s.active === false" class="badge neutral">Inativo</span>
          <span v-else class="muted">{{ brl(given(s)) }}</span>
          <RouterLink :to="`/patrocinador/${s.id}/editar`" class="btn small secondary">Editar</RouterLink>
        </div>
      </div>
    </div>

    <p v-if="!isAdmin && shown.length" class="footer-motto">Quer apoiar o Extremo Leste? <em>Fala com a diretoria do time.</em></p>

    <RouterLink v-if="isAdmin" to="/patrocinador/novo" class="btn fab">+ Novo patrocinador</RouterLink>
  </div>
</template>
