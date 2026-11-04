<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/composables/useStore'
import { brl, formatDateFull, formatDateLong, toISODate } from '@/utils/format'
import { championshipSummary, championshipSponsorItems } from '@/utils/finance'

const props = defineProps({ id: { type: String, required: true } })
const router = useRouter()
const store = useStore()
const { state, activePlayers, playerName, isAdmin } = store

const champ = computed(() => store.getChampionship(props.id))
const summary = computed(() => (champ.value ? championshipSummary(champ.value) : null))
const sponsorItems = computed(() => (isAdmin.value ? championshipSponsorItems(state.sponsors, props.id) : []))
const teamMode = computed(() => champ.value?.feeMode === 'team')

// ---- patrocínios deste campeonato (aporte já nasce ligado a ele) ----
const gift = reactive({ sponsorId: '', amount: '', date: toISODate(new Date()) })
const sponsorOptions = computed(() => state.sponsors.filter((sp) => sp.active !== false || sp.id === gift.sponsorId))
function addSponsorGift() {
  if (!gift.sponsorId || !(Number(gift.amount) > 0)) return
  store.addContribution(gift.sponsorId, {
    amount: gift.amount,
    date: gift.date,
    purpose: 'campeonato',
    championshipId: props.id
  })
  Object.assign(gift, { amount: '' })
}
const removingGift = ref('')
function removeSponsorGift(item) {
  if (removingGift.value !== item.id) {
    removingGift.value = item.id
    return
  }
  store.removeContribution(item.sponsorId, item.id)
  removingGift.value = ''
}
const finished = computed(() => champ.value?.status === 'finished')
const matches = computed(() =>
  state.matches.filter((m) => m.championshipId === props.id).sort((a, b) => (a.date < b.date ? 1 : -1))
)

// Jogadores ativos + quem já está inscrito mas foi inativado/removido
const roster = computed(() => {
  const list = activePlayers.value.map((p) => ({ id: p.id, name: p.nickname || p.name }))
  for (const id of summary.value?.roster || []) {
    if (!list.some((p) => p.id === id)) list.push({ id, name: playerName(id) })
  }
  return list
})

const progress = computed(() =>
  summary.value?.total ? Math.min(100, Math.round((summary.value.collected / summary.value.total) * 100)) : 0
)
const period = computed(() => {
  const { startDate, endDate } = champ.value
  if (!startDate) return ''
  return endDate && endDate !== startDate ? `${formatDateFull(startDate)} a ${formatDateFull(endDate)}` : formatDateFull(startDate)
})

const isEnrolled = (pid) => !!champ.value.roster?.[pid]
const isPaid = (pid) => !!champ.value.payments?.[pid]?.paid
const toggleEnrolled = (pid, e) => store.setRoster(props.id, pid, e.target.checked)
const togglePaid = (pid) => store.setChampionshipPaid(props.id, pid, !isPaid(pid), summary.value.perPlayer)
const enrollAll = () => store.setRoster(props.id, activePlayers.value.map((p) => p.id), true)
const clearAll = () => store.setRoster(props.id, summary.value.roster, false)

// Texto pronto para colar no grupo do WhatsApp (só admin: a lista mostra quem pagou)
async function shareList() {
  const c = champ.value
  const lines = [
    `🏆 ${c.name}${period.value ? ' (' + period.value + ')' : ''}`,
    summary.value.perPlayer ? `Inscrição: ${brl(summary.value.perPlayer)} por jogador` : 'Sem taxa de inscrição',
    ...summary.value.roster.map((pid) => `${isPaid(pid) ? '✅' : '⏳'} ${playerName(pid)}`),
    summary.value.pending.length && summary.value.perPlayer
      ? `\nFaltam ${summary.value.pending.length} pagamentos.`
      : '\nInscrição toda paga! 🎉'
  ]
  const text = lines.join('\n')
  if (navigator.share) {
    try { await navigator.share({ text }) } catch { /* cancelado */ }
  } else {
    try {
      await navigator.clipboard.writeText(text)
      alert('Lista copiada! É só colar no grupo.')
    } catch { /* sem permissão de área de transferência */ }
  }
}
</script>

<template>
  <div v-if="!champ" class="page empty">
    <p>Campeonato não encontrado.</p>
    <button class="btn" style="margin-top: 12px" @click="router.replace('/campeonatos')">Voltar</button>
  </div>

  <div v-else class="page">
    <section class="card stack" style="gap: 6px">
      <div class="row between">
        <h2 class="match-date">{{ champ.name }}</h2>
        <RouterLink v-if="isAdmin" :to="`/campeonato/${id}/editar`" class="btn small secondary">Editar</RouterLink>
      </div>
      <p v-if="period" class="muted">{{ period }}</p>
      <p v-if="champ.location" class="muted">📍 {{ champ.location }}</p>
      <p v-if="isAdmin && champ.fee" class="muted">
        Taxa: {{ brl(champ.fee) }} {{ champ.feeMode === 'team' ? 'do time' : 'por jogador' }}
      </p>
      <p v-if="champ.notes" style="white-space: pre-wrap">{{ champ.notes }}</p>
      <div v-if="isAdmin || finished" class="row" style="margin-top: 6px">
        <span v-if="finished" class="badge neutral">Encerrado</span>
        <button
          v-if="isAdmin"
          class="btn small secondary"
          @click="store.setChampionshipStatus(id, finished ? 'open' : 'finished')"
        >{{ finished ? 'Reabrir campeonato' : 'Marcar como encerrado' }}</button>
      </div>
    </section>

    <!-- Admin: a conta da inscrição, com o patrocínio abatido -->
    <section v-if="isAdmin" class="card stack">
      <p class="section-title">Patrocinadores do campeonato</p>

      <div v-if="champ.fee" class="calc">
        <div class="row between"><span>Inscrição {{ teamMode ? 'do time' : 'por jogador' }}</span><strong>{{ brl(champ.fee) }}</strong></div>
        <template v-if="teamMode">
          <div class="row between"><span>Patrocínios</span><strong class="cell-paid">− {{ brl(summary.sponsor) }}</strong></div>
          <div class="row between calc-total"><span>Sobra para o time dividir</span><strong>{{ brl(summary.toSplit) }}</strong></div>
          <p class="muted">
            <template v-if="summary.roster.length">{{ brl(summary.toSplit) }} ÷ {{ summary.roster.length }} inscritos = <strong>{{ brl(summary.perPlayer) }}</strong> por jogador</template>
            <template v-else>Escolha os inscritos abaixo para ver o valor por jogador.</template>
          </p>
          <p v-if="summary.sponsor >= champ.fee" class="badge">Patrocínio cobre toda a inscrição.</p>
        </template>
        <p v-else-if="sponsorItems.length" class="muted">Na cobrança por jogador o patrocínio não abate o valor. Para abater, mude a taxa para “do time” na edição do campeonato.</p>
      </div>
      <p v-else class="muted">Defina o valor da inscrição na edição do campeonato para ver a conta.</p>

      <p v-if="!sponsorItems.length" class="muted">Nenhum patrocinador ligado a este campeonato ainda.</p>
      <div v-else class="list">
        <div v-for="it in sponsorItems" :key="it.sponsorId + it.id" class="list-item">
          <div class="grow">
            <p>{{ it.sponsorName }}</p>
            <p v-if="it.date" class="muted">{{ formatDateFull(it.date) }}</p>
          </div>
          <strong>{{ brl(it.amount) }}</strong>
          <button type="button" class="btn small" :class="removingGift === it.id ? 'danger' : 'secondary'" @click="removeSponsorGift(it)">
            {{ removingGift === it.id ? 'Confirmar' : 'Tirar' }}
          </button>
        </div>
      </div>

      <form v-if="sponsorOptions.length" class="stack gift-form" @submit.prevent="addSponsorGift">
        <p class="section-title">Adicionar patrocinador</p>
        <label class="field">
          <span>Patrocinador</span>
          <select v-model="gift.sponsorId" required>
            <option value="" disabled>Escolha…</option>
            <option v-for="sp in sponsorOptions" :key="sp.id" :value="sp.id">{{ sp.name }}</option>
          </select>
        </label>
        <div class="grid2">
          <label class="field"><span>Valor (R$)</span><input v-model="gift.amount" type="number" min="0" step="0.01" inputmode="decimal" required /></label>
          <label class="field"><span>Data</span><input v-model="gift.date" type="date" required /></label>
        </div>
        <button class="btn">Adicionar</button>
      </form>
      <p v-else class="muted">Cadastre patrocinadores em <RouterLink to="/patrocinadores" class="more">Patrocinadores</RouterLink> para ligá-los aqui.</p>
    </section>

    <!-- Admin: escolher inscritos e controlar a taxa -->
    <section v-if="isAdmin" class="card stack">
      <div class="row between">
        <p class="section-title">Quem vai jogar · inscrição</p>
        <button v-if="summary.roster.length" class="btn small secondary" @click="shareList">Compartilhar</button>
      </div>

      <div v-if="summary.roster.length && summary.total" class="stack" style="gap: 6px">
        <div class="row between">
          <span><strong>{{ brl(summary.collected) }}</strong> de {{ brl(summary.total) }}</span>
          <span class="badge" :class="summary.pending.length ? 'warn' : ''">{{ summary.paid.length }}/{{ summary.roster.length }} pagos</span>
        </div>
        <div class="progress"><i :style="{ width: progress + '%' }" /></div>
        <p class="muted">
          {{ brl(summary.perPlayer) }} por jogador<template v-if="champ.feeMode === 'team'"> ({{ brl(summary.toSplit) }} dividido entre {{ summary.roster.length }})</template>
        </p>
      </div>

      <div v-if="roster.length" class="row">
        <button class="btn small secondary" @click="enrollAll">Marcar todos</button>
        <button v-if="summary.roster.length" class="btn small secondary" @click="clearAll">Limpar</button>
        <span class="muted grow" style="text-align: right">{{ summary.roster.length }} inscritos</span>
      </div>
      <p v-else class="muted">Cadastre os jogadores na aba “Jogadores” para inscrevê-los.</p>

      <div class="list">
        <label v-for="p in roster" :key="p.id" class="list-item">
          <input type="checkbox" class="check" :checked="isEnrolled(p.id)" @change="toggleEnrolled(p.id, $event)" />
          <span class="grow">{{ p.name }}</span>
          <button
            v-if="isEnrolled(p.id) && summary.perPlayer"
            type="button"
            class="pay-btn"
            :class="{ paid: isPaid(p.id) }"
            @click.prevent="togglePaid(p.id)"
          >{{ isPaid(p.id) ? 'Pago ✓' : brl(summary.perPlayer) }}</button>
        </label>
      </div>
      <p v-if="champ.feeMode === 'team' && summary.roster.length" class="muted">
        Se mudar a lista de inscritos ou os patrocínios, o valor por jogador é recalculado. Quem já pagou mantém o valor pago.
      </p>
    </section>

    <!-- Visitante: só quem está inscrito, sem valores -->
    <section v-else class="card stack">
      <p class="section-title">Inscritos ({{ summary.roster.length }})</p>
      <p v-if="!summary.roster.length" class="muted">A lista de inscritos ainda não foi definida.</p>
      <div class="list">
        <div v-for="pid in summary.roster" :key="pid" class="list-item">
          <span class="grow">{{ playerName(pid) }}</span>
        </div>
      </div>
    </section>

    <section class="card stack">
      <p class="section-title">Jogos do campeonato ({{ matches.length }})</p>
      <p v-if="!matches.length" class="muted">
        {{ isAdmin ? 'Nenhum jogo ligado. Ao marcar um jogo, escolha este campeonato.' : 'Nenhum jogo marcado ainda.' }}
      </p>
      <div class="list">
        <RouterLink v-for="m in matches" :key="m.id" :to="`/jogo/${m.id}`" class="list-item">
          <span class="grow">
            {{ formatDateLong(m.date) }}<template v-if="m.opponent"> · vs {{ m.opponent }}</template>
          </span>
          <strong v-if="m.status === 'played'" class="score" style="font-size: 1.25rem">{{ m.scoreUs }} x {{ m.scoreThem }}</strong>
          <span v-else class="badge neutral">Marcado</span>
        </RouterLink>
      </div>
    </section>
  </div>
</template>
