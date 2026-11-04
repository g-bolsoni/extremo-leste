<script setup>
import { ref } from 'vue'
import { useStore } from '@/composables/useStore'
import ChampionshipCard from '@/components/ChampionshipCard.vue'

const { openChampionships, finishedChampionships, isAdmin } = useStore()
const tab = ref('open')
</script>

<template>
  <div class="page">
    <div class="tabs" role="tablist">
      <button :class="{ active: tab === 'open' }" @click="tab = 'open'">Em andamento ({{ openChampionships.length }})</button>
      <button :class="{ active: tab === 'finished' }" @click="tab = 'finished'">Encerrados ({{ finishedChampionships.length }})</button>
    </div>

    <template v-if="tab === 'open'">
      <div v-if="!openChampionships.length" class="empty">
        <span class="marker">Bora disputar um título?</span>
        <p v-if="isAdmin">Cadastre o campeonato, escolha quem vai jogar e controle a taxa de inscrição.</p>
        <p v-else>Os campeonatos em que o time está inscrito aparecem aqui.</p>
      </div>
      <ChampionshipCard v-for="c in openChampionships" :key="c.id" :championship="c" />
    </template>

    <template v-else>
      <div v-if="!finishedChampionships.length" class="empty">
        <span class="marker">Nenhum campeonato encerrado.</span>
        <p>Quando acabar um, ele vem para cá.</p>
      </div>
      <ChampionshipCard v-for="c in finishedChampionships" :key="c.id" :championship="c" />
    </template>

    <RouterLink v-if="isAdmin" to="/campeonato/novo" class="btn fab">+ Novo campeonato</RouterLink>
  </div>
</template>
