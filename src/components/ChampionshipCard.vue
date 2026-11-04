<script setup>
import { computed } from 'vue'
import { formatDateFull, brl } from '@/utils/format'
import { championshipSummary } from '@/utils/finance'
import { useStore } from '@/composables/useStore'

const props = defineProps({ championship: { type: Object, required: true } })
const { isAdmin } = useStore()

const s = computed(() => championshipSummary(props.championship))
const finished = computed(() => props.championship.status === 'finished')
const period = computed(() => {
  const { startDate, endDate } = props.championship
  if (!startDate) return ''
  return endDate && endDate !== startDate ? `${formatDateFull(startDate)} a ${formatDateFull(endDate)}` : formatDateFull(startDate)
})
</script>

<template>
  <RouterLink :to="`/campeonato/${championship.id}`" class="card link stack" style="gap: 8px">
    <div class="row between">
      <span class="match-date">{{ championship.name }}</span>
      <span v-if="finished" class="badge neutral">Encerrado</span>
    </div>
    <p v-if="championship.location || period" class="muted">
      {{ [championship.location, period].filter(Boolean).join(' · ') }}
    </p>
    <div class="row between muted">
      <span>{{ s.roster.length }} {{ s.roster.length === 1 ? 'inscrito' : 'inscritos' }}</span>
      <!-- Taxa e pagamento da inscrição: só admin -->
      <template v-if="isAdmin">
        <span v-if="!s.roster.length">Escolha quem vai jogar</span>
        <span v-else-if="!s.total">Sem taxa</span>
        <span v-else :class="s.pending.length ? 'cell-owe' : 'cell-paid'">
          {{ s.pending.length ? `${s.pending.length} sem pagar · ${brl(s.perPlayer)} cada` : 'Inscrição paga ✓' }}
        </span>
      </template>
    </div>
  </RouterLink>
</template>
