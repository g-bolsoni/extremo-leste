<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/composables/useStore'
import { formatDateLong, formatDateShort, brl } from '@/utils/format'
import { matchSummary } from '@/utils/finance'
import PhotoGallery from '@/components/PhotoGallery.vue'

const props = defineProps({ id: { type: String, required: true } })
const router = useRouter()
const store = useStore()
const { state, activePlayers, playerName, isAdmin } = store

const match = computed(() => store.getMatch(props.id))
const champ = computed(() => (match.value?.championshipId ? store.getChampionship(match.value.championshipId) : null))
const summary = computed(() => (match.value ? matchSummary(match.value) : null))
const isPlayed = computed(() => match.value?.status === 'played')
const photos = computed(() => state.photos[props.id] || [])
const uploading = ref(false)
const editingResult = ref(false)

const result = reactive({
  scoreUs: match.value?.scoreUs ?? 0,
  scoreThem: match.value?.scoreThem ?? 0,
  notes: match.value?.notes ?? ''
})

// Jogadores ativos + quem já estava na partida mas foi desativado/removido
const roster = computed(() => {
  const list = activePlayers.value.map((p) => ({ id: p.id, name: p.nickname || p.name }))
  for (const id of summary.value?.attendees || []) {
    if (!list.some((p) => p.id === id)) list.push({ id, name: playerName(id) })
  }
  return list
})

const progress = computed(() =>
  summary.value?.expected ? Math.min(100, Math.round((summary.value.collected / summary.value.expected) * 100)) : 0
)

onMounted(() => store.watchPhotos(props.id))
onUnmounted(() => store.unwatchPhotos(props.id))

const isPresent = (pid) => !!match.value.attendance?.[pid]
const isPaid = (pid) => !!match.value.payments?.[pid]?.paid
const togglePresence = (pid, e) => store.setAttendance(props.id, pid, e.target.checked)
const togglePaid = (pid) => store.setPaid(props.id, pid, !isPaid(pid), match.value.perPlayer)

function saveResult() {
  store.saveResult(props.id, {
    scoreUs: Number(result.scoreUs) || 0,
    scoreThem: Number(result.scoreThem) || 0,
    notes: result.notes.trim()
  })
  editingResult.value = false
}

function startEditResult() {
  Object.assign(result, { scoreUs: match.value.scoreUs ?? 0, scoreThem: match.value.scoreThem ?? 0, notes: match.value.notes ?? '' })
  editingResult.value = true
}

async function addPhotos(files) {
  uploading.value = true
  await store.addPhotos(props.id, files)
  uploading.value = false
}

// Texto pronto para colar no grupo do WhatsApp (só admin: a lista mostra quem pagou)
async function shareList() {
  const m = match.value
  const lines = [
    `⚽ ${formatDateLong(m.date)} (${formatDateShort(m.date)})${m.location ? ' — ' + m.location : ''}`,
    `Valor: ${brl(m.perPlayer)} por pessoa`,
    ...summary.value.attendees.map((pid) => `${isPaid(pid) ? '✅' : '⏳'} ${playerName(pid)}`),
    summary.value.pending.length ? `\nFaltam ${summary.value.pending.length} pagamentos.` : '\nTodos pagaram! 🎉'
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
  <div v-if="!match" class="page empty">
    <p>Jogo não encontrado.</p>
    <button class="btn" style="margin-top: 12px" @click="router.replace('/')">Voltar</button>
  </div>

  <div v-else class="page">
    <!-- Informações -->
    <section class="card stack" style="gap: 6px">
      <div class="row between">
        <h2 class="match-date">{{ formatDateLong(match.date) }}<template v-if="match.time"> · {{ match.time }}</template></h2>
        <RouterLink v-if="isAdmin" :to="`/jogo/${id}/editar`" class="btn small secondary">Editar</RouterLink>
      </div>
      <RouterLink v-if="champ" :to="`/campeonato/${champ.id}`" class="section-title">Campeonato: {{ champ.name }} →</RouterLink>
      <p>{{ match.opponent ? `vs ${match.opponent}` : champ ? 'Jogo do campeonato' : 'Racha de domingo' }}</p>
      <p v-if="match.location" class="muted">📍 {{ match.location }}</p>
      <p v-if="isAdmin && match.totalCost" class="muted">
        Custo ({{ { campo: 'campo', juiz: 'juiz', ambos: 'campo + juiz' }[match.costType] || 'campo' }}): {{ brl(match.totalCost) }}
      </p>
    </section>

    <!-- Resultado: o público vê o placar; só admin registra e edita -->
    <section v-if="isAdmin || isPlayed" class="card stack">
      <p class="section-title">Resultado</p>

      <template v-if="isPlayed && !editingResult">
        <p class="score" style="text-align: center">{{ match.scoreUs }} <span class="muted">x</span> {{ match.scoreThem }}</p>
        <p v-if="match.notes" class="muted" style="white-space: pre-wrap">{{ match.notes }}</p>
        <div v-if="isAdmin" class="row">
          <button class="btn small secondary" @click="startEditResult">Editar resultado</button>
          <button class="btn small secondary" @click="store.reopenMatch(id)">Voltar p/ marcados</button>
        </div>
      </template>

      <form v-else-if="isAdmin" class="stack" @submit.prevent="saveResult">
        <div class="grid2">
          <label class="field"><span>Nosso time</span><input v-model="result.scoreUs" type="number" min="0" inputmode="numeric" /></label>
          <label class="field"><span>{{ match.opponent || 'Adversário' }}</span><input v-model="result.scoreThem" type="number" min="0" inputmode="numeric" /></label>
        </div>
        <label class="field"><span>Observações (gols, destaques…)</span><textarea v-model="result.notes" rows="2" /></label>
        <button class="btn">{{ isPlayed ? 'Salvar resultado' : 'Registrar resultado e marcar como jogado' }}</button>
      </form>
    </section>

    <!-- Admin: presença + pagamentos -->
    <section v-if="isAdmin" class="card stack">
      <div class="row between">
        <p class="section-title">Quem jogou · pagamentos</p>
        <button v-if="summary.attendees.length" class="btn small secondary" @click="shareList">Compartilhar</button>
      </div>

      <div v-if="summary.attendees.length && match.perPlayer" class="stack" style="gap: 6px">
        <div class="row between">
          <span><strong>{{ brl(summary.collected) }}</strong> de {{ brl(summary.expected) }}</span>
          <span class="badge" :class="summary.pending.length ? 'warn' : ''">{{ summary.paid.length }}/{{ summary.attendees.length }} pagos</span>
        </div>
        <div class="progress"><i :style="{ width: progress + '%' }" /></div>
        <p v-if="match.totalCost" class="muted">
          Custo {{ brl(match.totalCost) }} ·
          <span :class="summary.balance < 0 ? 'cell-owe' : 'cell-paid'">{{ summary.balance < 0 ? 'faltam ' + brl(-summary.balance) : 'coberto ✓' }}</span>
        </p>
      </div>

      <p v-if="!roster.length" class="muted">Cadastre os jogadores na aba “Jogadores” para marcar presença.</p>
      <div class="list">
        <label v-for="p in roster" :key="p.id" class="list-item">
          <input type="checkbox" class="check" :checked="isPresent(p.id)" @change="togglePresence(p.id, $event)" />
          <span class="grow">{{ p.name }}</span>
          <button
            v-if="isPresent(p.id) && match.perPlayer"
            type="button"
            class="pay-btn"
            :class="{ paid: isPaid(p.id) }"
            @click.prevent="togglePaid(p.id)"
          >{{ isPaid(p.id) ? 'Pago ✓' : brl(match.perPlayer) }}</button>
        </label>
      </div>
    </section>

    <!-- Visitante: só os nomes de quem jogou, sem valores nem pagamentos -->
    <section v-else-if="summary.attendees.length" class="card stack">
      <p class="section-title">{{ isPlayed ? 'Quem jogou' : 'Confirmados' }} ({{ summary.attendees.length }})</p>
      <div class="list">
        <div v-for="pid in summary.attendees" :key="pid" class="list-item">
          <span class="grow">{{ playerName(pid) }}</span>
        </div>
      </div>
    </section>

    <!-- Fotos -->
    <section class="card">
      <PhotoGallery
        :photos="photos"
        :busy="uploading"
        :readonly="!isAdmin"
        @add="addPhotos"
        @remove="(pid) => store.removePhoto(id, pid)"
      />
    </section>
  </div>
</template>
