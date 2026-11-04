<script setup>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/composables/useStore'
import { toISODate } from '@/utils/format'

const props = defineProps({ id: { type: String, default: '' } })
const router = useRouter()
const { getChampionship, saveChampionship, removeChampionship } = useStore()

const existing = props.id ? getChampionship(props.id) : null

const form = reactive({
  name: existing?.name || '',
  location: existing?.location || '',
  startDate: existing?.startDate || toISODate(new Date()),
  endDate: existing?.endDate || '',
  feeMode: existing?.feeMode || 'team',
  fee: existing?.fee ?? '',
  notes: existing?.notes || ''
})

function submit() {
  const data = {
    name: form.name.trim(),
    location: form.location.trim(),
    startDate: form.startDate,
    endDate: form.endDate || '',
    feeMode: form.feeMode,
    fee: Number(form.fee) || 0,
    notes: form.notes.trim()
  }
  if (existing) {
    saveChampionship({ id: existing.id, ...data })
    router.replace(`/campeonato/${existing.id}`)
  } else {
    const id = saveChampionship({ ...data, status: 'open', roster: {}, payments: {}, createdAt: Date.now() })
    router.replace(`/campeonato/${id}`)
  }
}

async function remove() {
  if (!confirm('Excluir este campeonato, com inscritos e pagamentos? Não dá para desfazer.')) return
  await removeChampionship(existing.id)
  router.replace('/campeonatos')
}
</script>

<template>
  <form class="page" @submit.prevent="submit">
    <label class="field"><span>Nome do campeonato</span><input v-model="form.name" required placeholder="Ex.: Copa Zona Leste" /></label>
    <label class="field"><span>Local</span><input v-model="form.location" placeholder="Ex.: Arena Vila Esperança" /></label>
    <div class="grid2">
      <label class="field"><span>Início</span><input v-model="form.startDate" type="date" required /></label>
      <label class="field"><span>Fim (opcional)</span><input v-model="form.endDate" type="date" :min="form.startDate" /></label>
    </div>

    <div class="card stack">
      <p class="section-title">Taxa de inscrição</p>
      <label class="field">
        <span>Como a taxa é cobrada?</span>
        <select v-model="form.feeMode">
          <option value="team">Valor do time (dividir entre os inscritos)</option>
          <option value="player">Valor por jogador</option>
        </select>
      </label>
      <label class="field">
        <span>{{ form.feeMode === 'team' ? 'Valor da inscrição do time (R$)' : 'Valor por jogador (R$)' }}</span>
        <input v-model="form.fee" type="number" min="0" step="0.01" inputmode="decimal" />
      </label>
      <p class="muted">
        {{ form.feeMode === 'team'
          ? 'Depois que você escolher quem vai jogar, o app divide o valor entre os inscritos.'
          : 'Cada jogador inscrito paga esse valor.' }}
      </p>
    </div>

    <label class="field">
      <span>Observações (aparecem para todos)</span>
      <textarea v-model="form.notes" rows="2" placeholder="Dias de jogo, regras, o que levar…" />
    </label>
    <p class="muted">Este campo é público. Não escreva valores, prazos de pagamento nem chave Pix aqui.</p>

    <button class="btn block">{{ existing ? 'Salvar alterações' : 'Criar campeonato' }}</button>
    <button v-if="existing" type="button" class="btn danger block" @click="remove">Excluir campeonato</button>
  </form>
</template>
