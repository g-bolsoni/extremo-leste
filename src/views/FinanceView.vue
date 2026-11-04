<script setup>
import { computed, ref } from 'vue'
import { useStore } from '@/composables/useStore'
import { brl, formatDateShort } from '@/utils/format'
import { debtsByPlayer, matchSummary, championshipSummary, sponsorsTotals, sponsorSummary, PURPOSES } from '@/utils/finance'

const { state, played, playerName } = useStore()
const showAll = ref(false)

const sponsorMoney = computed(() => sponsorsTotals(state.sponsors))
const topSponsors = computed(() =>
  state.sponsors
    .map((sp) => ({ id: sp.id, name: sp.name, total: sponsorSummary(sp).total }))
    .filter((sp) => sp.total > 0)
    .sort((a, b) => b.total - a.total)
)

const debts = computed(() => debtsByPlayer(state.matches, state.championships))
const entryFees = computed(() =>
  state.championships.reduce(
    (acc, c) => {
      const s = championshipSummary(c)
      acc.collected += s.collected
      acc.total += s.total
      return acc
    },
    { collected: 0, total: 0 }
  )
)
const owedText = (d) =>
  [
    d.matchIds.length && `${d.matchIds.length} ${d.matchIds.length > 1 ? 'jogos' : 'jogo'}`,
    d.championshipIds.length && `${d.championshipIds.length} ${d.championshipIds.length > 1 ? 'inscrições' : 'inscrição'}`
  ]
    .filter(Boolean)
    .join(' + ') + ' sem pagar'
const debtors = computed(() =>
  Object.entries(debts.value)
    .map(([id, d]) => ({ id, name: playerName(id), ...d }))
    .sort((a, b) => b.total - a.total)
)
const totalOpen = computed(() => debtors.value.reduce((s, d) => s + d.total, 0))

// Matriz: últimos 8 jogos (ou todos) x jogadores que já participaram de algum
const matrixMatches = computed(() => (showAll.value ? played.value : played.value.slice(0, 8)).slice().reverse())
const matrixPlayers = computed(() => {
  const ids = new Set()
  for (const m of played.value) for (const [id, p] of Object.entries(m.attendance || {})) if (p) ids.add(id)
  return [...ids].map((id) => ({ id, name: playerName(id) })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
})

const cell = (m, pid) => {
  if (!m.attendance?.[pid]) return { t: '–', c: 'cell-na' }
  return m.payments?.[pid]?.paid ? { t: '✓', c: 'cell-paid' } : { t: '✗', c: 'cell-owe' }
}

const totals = computed(() =>
  played.value.reduce(
    (acc, m) => {
      const s = matchSummary(m)
      acc.collected += s.collected
      acc.cost += s.totalCost
      return acc
    },
    { collected: 0, cost: 0 }
  )
)
</script>

<template>
  <div class="page">
    <section class="card stack">
      <p class="section-title">Em aberto</p>
      <p class="score" :class="totalOpen ? 'cell-owe' : 'cell-paid'">{{ brl(totalOpen) }}</p>
      <p class="muted">Jogos: {{ brl(totals.collected) }} arrecadados · Custos {{ brl(totals.cost) }}</p>
      <p v-if="entryFees.total" class="muted">Inscrições: {{ brl(entryFees.collected) }} de {{ brl(entryFees.total) }}</p>
    </section>

    <section class="card stack">
      <div class="row between">
        <p class="section-title">Patrocínios recebidos</p>
        <RouterLink to="/patrocinadores" class="more">Gerenciar →</RouterLink>
      </div>
      <p class="score cell-paid">{{ brl(sponsorMoney.total) }}</p>
      <div class="grid3">
        <div v-for="(label, key) in PURPOSES" :key="key">
          <p class="muted">{{ label }}</p>
          <p><strong>{{ brl(sponsorMoney.byPurpose[key]) }}</strong></p>
        </div>
      </div>
      <div v-if="topSponsors.length" class="list">
        <div v-for="sp in topSponsors" :key="sp.id" class="list-item">
          <span class="grow">{{ sp.name }}</span>
          <strong>{{ brl(sp.total) }}</strong>
        </div>
      </div>
    </section>

    <section class="stack">
      <p class="section-title">Quem está devendo</p>
      <div v-if="!debtors.length" class="empty card">Ninguém devendo. 🎉</div>
      <div v-else class="card">
        <div class="list">
          <div v-for="d in debtors" :key="d.id" class="list-item">
            <div class="grow">
              <p>{{ d.name }}</p>
              <p class="muted">{{ owedText(d) }}</p>
            </div>
            <strong class="cell-owe">{{ brl(d.total) }}</strong>
          </div>
        </div>
      </div>
    </section>

    <section v-if="matrixMatches.length && matrixPlayers.length" class="stack">
      <div class="row between">
        <p class="section-title">Histórico</p>
        <button class="btn small secondary" @click="showAll = !showAll">{{ showAll ? 'Últimos 8' : 'Ver todos' }}</button>
      </div>
      <div class="matrix-wrap">
        <table class="matrix">
          <thead>
            <tr>
              <th>Jogador</th>
              <th v-for="m in matrixMatches" :key="m.id"><RouterLink :to="`/jogo/${m.id}`">{{ formatDateShort(m.date) }}</RouterLink></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in matrixPlayers" :key="p.id">
              <td>{{ p.name }}</td>
              <td v-for="m in matrixMatches" :key="m.id" :class="cell(m, p.id).c">{{ cell(m, p.id).t }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="muted">✓ pagou · ✗ não pagou · – não jogou</p>
    </section>
  </div>
</template>
