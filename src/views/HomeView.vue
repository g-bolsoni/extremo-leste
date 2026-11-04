<script setup>
import { ref } from 'vue'
import { useStore } from '@/composables/useStore'
import { formatDateLong } from '@/utils/format'
import MatchCard from '@/components/MatchCard.vue'
import Skyline from '@/components/Skyline.vue'
import SponsorsStrip from '@/components/SponsorsStrip.vue'

const { upcoming, played, isAdmin } = useStore()
const tab = ref('upcoming')
</script>

<template>
  <section class="hero">
    <p class="tag">Da quebrada pro mundo!</p>
    <h2 class="brush">
      <span class="w">EXTREMO</span>
      <span class="r">LESTE</span>
    </h2>
    <p class="motto">Nós não é moda, nós é movimento!</p>
    <p v-if="upcoming.length" class="next">Próximo racha: <b>{{ formatDateLong(upcoming[0].date) }}</b></p>
    <Skyline />
  </section>

  <div class="page">
    <div class="tabs" role="tablist">
      <button :class="{ active: tab === 'upcoming' }" @click="tab = 'upcoming'">Marcados ({{ upcoming.length }})</button>
      <button :class="{ active: tab === 'played' }" @click="tab = 'played'">Jogados ({{ played.length }})</button>
    </div>

    <template v-if="tab === 'upcoming'">
      <div v-if="!upcoming.length" class="empty">
        <span class="marker">Domingo sem jogo marcado?</span>
        <p v-if="isAdmin">Toque em “Novo jogo” e chama a rapaziada.</p>
        <p v-else>Assim que o próximo jogo for marcado, ele aparece aqui.</p>
      </div>
      <MatchCard v-for="m in upcoming" :key="m.id" :match="m" />
    </template>

    <template v-else>
      <div v-if="!played.length" class="empty">
        <span class="marker">A história ainda vai ser escrita.</span>
        <p>Os jogos finalizados aparecem aqui, com placar e fotos.</p>
      </div>
      <MatchCard v-for="m in played" :key="m.id" :match="m" />
    </template>

    <SponsorsStrip />

    <p class="footer-motto">Extremo até no nome, <em>Leste até no coração!</em></p>

    <RouterLink v-if="isAdmin" to="/jogo/novo" class="btn fab">+ Novo jogo</RouterLink>
  </div>
</template>
