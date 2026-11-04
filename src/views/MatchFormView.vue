<script setup>
import { computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/composables/useStore'
import { nextSunday, brl } from '@/utils/format'

const props = defineProps({ id: { type: String, default: '' } })
const router = useRouter()
const { getMatch, saveMatch, removeMatch, state } = useStore()

const existing = props.id ? getMatch(props.id) : null

// Sugere os dados do último jogo para agilizar (local, horário, valores)
const last = state.matches[0]
// Campeonatos disponíveis para ligar ao jogo (em andamento + o já escolhido, se encerrado)
const champOptions = computed(() =>
  state.championships.filter((c) => c.status !== 'finished' || c.id === existing?.championshipId)
)

const form = reactive({
  championshipId: existing?.championshipId || '',
  date: existing?.date || nextSunday(),
  time: existing?.time ?? last?.time ?? '09:00',
  opponent: existing?.opponent || '',
  location: existing?.location ?? last?.location ?? '',
  costType: existing?.costType ?? last?.costType ?? 'campo',
  totalCost: existing?.totalCost ?? last?.totalCost ?? '',
  perPlayer: existing?.perPlayer ?? last?.perPlayer ?? '',
  expectedPlayers: 14
})

const suggestion = computed(() => {
  const total = Number(form.totalCost)
  const n = Number(form.expectedPlayers)
  return total > 0 && n > 0 ? Math.ceil((total / n) * 100) / 100 : null
})

function submit() {
  const data = {
    championshipId: form.championshipId,
    date: form.date,
    time: form.time,
    opponent: form.opponent.trim(),
    location: form.location.trim(),
    costType: form.costType,
    totalCost: Number(form.totalCost) || 0,
    perPlayer: Number(form.perPlayer) || 0
  }
  if (existing) {
    saveMatch({ id: existing.id, ...data })
    router.replace(`/jogo/${existing.id}`)
  } else {
    const id = saveMatch({ ...data, status: 'scheduled', attendance: {}, payments: {}, createdAt: Date.now() })
    router.replace(`/jogo/${id}`)
  }
}

async function remove() {
  if (!confirm('Excluir este jogo, com pagamentos e fotos? Não dá para desfazer.')) return
  await removeMatch(existing.id)
  router.replace('/')
}
</script>

<template>
  <form class="page" @submit.prevent="submit">
    <label v-if="champOptions.length" class="field">
      <span>Campeonato (opcional)</span>
      <select v-model="form.championshipId">
        <option value="">Racha de domingo (sem campeonato)</option>
        <option v-for="c in champOptions" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </label>
    <div class="grid2">
      <label class="field"><span>Data</span><input v-model="form.date" type="date" required /></label>
      <label class="field"><span>Horário</span><input v-model="form.time" type="time" /></label>
    </div>
    <label class="field"><span>Adversário (opcional)</span><input v-model="form.opponent" placeholder="Ex.: Time do Bairro" /></label>
    <label class="field"><span>Local</span><input v-model="form.location" placeholder="Ex.: Campo do Zé" /></label>

    <div class="card stack">
      <p class="section-title">Custo da partida</p>
      <label class="field">
        <span>O que estamos pagando?</span>
        <select v-model="form.costType">
          <option value="campo">Campo</option>
          <option value="juiz">Juiz</option>
          <option value="ambos">Campo + juiz</option>
        </select>
      </label>
      <div class="grid2">
        <label class="field"><span>Custo total (R$)</span><input v-model="form.totalCost" type="number" min="0" step="0.01" inputmode="decimal" /></label>
        <label class="field"><span>Jogadores previstos</span><input v-model="form.expectedPlayers" type="number" min="1" inputmode="numeric" /></label>
      </div>
      <label class="field">
        <span>Valor por jogador (R$)</span>
        <input v-model="form.perPlayer" type="number" min="0" step="0.01" inputmode="decimal" />
      </label>
      <button v-if="suggestion" type="button" class="btn secondary small" @click="form.perPlayer = suggestion">
        Usar {{ brl(suggestion) }} por jogador
      </button>
    </div>

    <button class="btn block">{{ existing ? 'Salvar alterações' : 'Marcar jogo' }}</button>
    <button v-if="existing" type="button" class="btn danger block" @click="remove">Excluir jogo</button>
  </form>
</template>
