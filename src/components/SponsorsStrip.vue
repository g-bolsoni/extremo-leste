<script setup>
import { computed } from 'vue'
import { useStore } from '@/composables/useStore'
import SponsorTile from '@/components/SponsorTile.vue'

// Faixa de patrocinadores na página inicial. Visitante só vê se houver algum;
// admin sempre vê, para conseguir chegar ao cadastro mesmo sem nenhum.
const { state, isAdmin } = useStore()
const list = computed(() => {
  const active = state.sponsors.filter((s) => s.active !== false)
  // destaques primeiro
  return [...active.filter((s) => s.featured), ...active.filter((s) => !s.featured)].slice(0, 10)
})
</script>

<template>
  <section v-if="list.length || isAdmin" class="strip-section">
    <div class="row between">
      <p class="section-title">Quem apoia o time</p>
      <RouterLink to="/patrocinadores" class="more">Ver todos →</RouterLink>
    </div>
    <div v-if="list.length" class="strip">
      <SponsorTile v-for="s in list" :key="s.id" :sponsor="s" size="sm" :show-supports="false" />
    </div>
    <p v-else class="muted">Nenhum patrocinador cadastrado. <RouterLink to="/patrocinador/novo" class="more">Cadastrar o primeiro →</RouterLink></p>
  </section>
</template>
