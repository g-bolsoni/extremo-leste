<script setup>
import { computed } from 'vue'
import { formatDateLong, brl, isPast } from '@/utils/format'
import { matchSummary } from '@/utils/finance'
import { useStore } from '@/composables/useStore'

const props = defineProps({ match: { type: Object, required: true } })
const { getChampionship, isAdmin } = useStore()

const champ = computed(() => (props.match.championshipId ? getChampionship(props.match.championshipId) : null))
const summary = computed(() => matchSummary(props.match))
const isPlayed = computed(() => props.match.status === 'played')
const needsResult = computed(() => !isPlayed.value && isPast(props.match.date))
const resultLabel = computed(() => {
  const { scoreUs: a, scoreThem: b } = props.match
  if (a > b) return { text: 'Vitória', cls: '' }
  if (a < b) return { text: 'Derrota', cls: 'danger' }
  return { text: 'Empate', cls: 'neutral' }
})
</script>

<template>
  <RouterLink :to="`/jogo/${match.id}`" class="card link stack" style="gap: 8px">
    <div class="row between">
      <span class="match-date">{{ formatDateLong(match.date) }}<template v-if="match.time"> · {{ match.time }}</template></span>
      <span v-if="isPlayed" class="badge" :class="resultLabel.cls">{{ resultLabel.text }}</span>
      <span v-else-if="needsResult && isAdmin" class="badge warn">Falta o resultado</span>
    </div>

    <div class="row between">
      <div class="grow">
        <p v-if="champ" class="section-title" style="margin-bottom: 2px">{{ champ.name }}</p>
        <p>{{ match.opponent ? `vs ${match.opponent}` : champ ? 'Jogo do campeonato' : 'Racha de domingo' }}</p>
        <p v-if="match.location" class="muted">{{ match.location }}</p>
      </div>
      <p v-if="isPlayed" class="score">{{ match.scoreUs }} <span class="muted">x</span> {{ match.scoreThem }}</p>
    </div>

    <!-- Quantos jogaram é público; valores e pagamentos só aparecem para admin -->
    <div v-if="summary.attendees.length || (isAdmin && match.perPlayer)" class="row between muted">
      <span v-if="summary.attendees.length">{{ summary.attendees.length }} {{ isPlayed ? 'jogaram' : 'confirmados' }}</span>
      <span v-else />
      <template v-if="isAdmin">
        <span v-if="isPlayed && summary.attendees.length" :class="summary.pending.length ? 'cell-owe' : 'cell-paid'">
          {{ summary.pending.length ? `${summary.pending.length} sem pagar` : 'Tudo pago ✓' }}
        </span>
        <span v-else-if="match.perPlayer">{{ brl(match.perPlayer) }} por pessoa</span>
      </template>
    </div>
  </RouterLink>
</template>
