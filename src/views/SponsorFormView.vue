<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/composables/useStore'
import { uploadLogo } from '@/services/photoService'
import { brl, formatDateFull, toISODate } from '@/utils/format'
import { PURPOSES, sponsorSummary } from '@/utils/finance'
import SponsorTile from '@/components/SponsorTile.vue'

const props = defineProps({ id: { type: String, default: '' } })
const router = useRouter()
const store = useStore()
const { state } = store

const existing = computed(() => (props.id ? store.getSponsor(props.id) : null))
const summary = computed(() => (existing.value ? sponsorSummary(existing.value) : null))

const form = reactive({
  name: '',
  website: '',
  logoUrl: '',
  inline: false,
  featured: false,
  active: true,
  supports: { campeonato: false, uniforme: false, geral: true },
  // privados (só admin)
  contact: '',
  phone: '',
  privateNote: ''
})

// Preenche o formulário com o patrocinador existente (também se os dados chegarem depois da tela)
let filled = false
function fill(sp) {
  if (!sp || filled) return
  filled = true
  Object.assign(form, {
    name: sp.name || '',
    website: sp.website || '',
    logoUrl: sp.logoUrl || '',
    inline: !!sp.inline,
    featured: !!sp.featured,
    active: sp.active !== false,
    supports: { campeonato: false, uniforme: false, geral: false, ...(sp.supports || {}) },
    contact: sp.contact || '',
    phone: sp.phone || '',
    privateNote: sp.privateNote || ''
  })
}
fill(existing.value)
watch(existing, fill)

// ---- logo ----
const fileInput = ref(null)
const uploading = ref(false)
const logoError = ref('')
async function pickLogo(e) {
  const file = e.target.files[0]
  e.target.value = ''
  if (!file) return
  uploading.value = true
  logoError.value = ''
  try {
    const { logoUrl, inline } = await uploadLogo(file)
    form.logoUrl = logoUrl
    form.inline = inline
  } catch (err) {
    logoError.value = err?.message || 'Não foi possível usar essa imagem.'
  } finally {
    uploading.value = false
  }
}
const removeLogo = () => Object.assign(form, { logoUrl: '', inline: false })

// ---- salvar ----
const noSupport = computed(() => !Object.values(form.supports).some(Boolean))
const preview = computed(() => ({
  name: form.name.trim() || 'Nome do patrocinador',
  logoUrl: form.logoUrl,
  website: form.website,
  featured: form.featured,
  supports: form.supports
}))

function submit() {
  if (noSupport.value) return
  const data = {
    name: form.name.trim(),
    website: form.website.trim(),
    logoUrl: form.logoUrl,
    inline: form.inline,
    featured: form.featured,
    active: form.active,
    supports: { ...form.supports },
    contact: form.contact.trim(),
    phone: form.phone.trim(),
    privateNote: form.privateNote.trim()
  }
  if (existing.value) {
    store.saveSponsor({ id: existing.value.id, ...data })
    router.replace('/patrocinadores')
  } else {
    const id = store.saveSponsor({ ...data, createdAt: Date.now() })
    // Vai direto para a edição, onde dá para registrar os aportes
    router.replace(`/patrocinador/${id}/editar`)
  }
}

// ---- aportes (só admin) ----
const gift = reactive({ amount: '', date: toISODate(new Date()), purpose: 'geral', championshipId: '', note: '' })
const champName = (cid) => state.championships.find((c) => c.id === cid)?.name || ''

function addGift() {
  if (!existing.value || !(Number(gift.amount) > 0)) return
  store.addContribution(existing.value.id, { ...gift })
  Object.assign(gift, { amount: '', note: '' })
}

// Confirmação dentro da própria tela (o confirm() do navegador não funciona em todo lugar)
const removingGift = ref('')
const removingSponsor = ref(false)
function removeGift(cid) {
  if (removingGift.value !== cid) {
    removingGift.value = cid
    return
  }
  store.removeContribution(existing.value.id, cid)
  removingGift.value = ''
}
async function removeSponsor() {
  if (!removingSponsor.value) {
    removingSponsor.value = true
    return
  }
  await store.removeSponsor(existing.value.id)
  router.replace('/patrocinadores')
}
</script>

<template>
  <div v-if="id && !existing" class="page empty">
    <p>Patrocinador não encontrado.</p>
    <button class="btn" style="margin-top: 12px" @click="router.replace('/patrocinadores')">Voltar</button>
  </div>

  <div v-else class="page">
    <form class="stack" style="gap: 16px" @submit.prevent="submit">
      <!-- Como o público vai ver -->
      <section class="card stack">
        <p class="section-title">Como aparece para o público</p>
        <div class="preview-box"><SponsorTile :sponsor="preview" :size="form.featured ? 'lg' : 'md'" /></div>
      </section>

      <!-- Dados públicos -->
      <section class="card stack">
        <p class="section-title">Aparece para todos</p>
        <label class="field"><span>Nome</span><input v-model="form.name" required placeholder="Ex.: Mercadinho do Zé" /></label>
        <label class="field"><span>Site ou Instagram (opcional)</span><input v-model="form.website" placeholder="https://…" inputmode="url" /></label>

        <div class="field">
          <span>Logo</span>
          <div class="row">
            <button type="button" class="btn small secondary" :disabled="uploading" @click="fileInput.click()">
              {{ uploading ? 'Enviando…' : form.logoUrl ? 'Trocar logo' : 'Escolher logo' }}
            </button>
            <button v-if="form.logoUrl" type="button" class="btn small danger" @click="removeLogo">Remover</button>
            <input ref="fileInput" type="file" accept="image/*" hidden @change="pickLogo" />
          </div>
          <p v-if="logoError" class="badge danger">{{ logoError }}</p>
          <p v-else class="muted">Sem logo, o site mostra as iniciais do nome.</p>
        </div>

        <div class="field">
          <span>Ajuda com</span>
          <label v-for="(label, key) in PURPOSES" :key="key" class="check-row">
            <input v-model="form.supports[key]" type="checkbox" class="check" />
            <span>{{ label }}</span>
          </label>
          <p v-if="noSupport" class="badge warn">Marque pelo menos uma opção.</p>
        </div>

        <label class="check-row">
          <input v-model="form.featured" type="checkbox" class="check" />
          <span>Destaque (aparece maior e primeiro)</span>
        </label>
        <label class="check-row">
          <input v-model="form.active" type="checkbox" class="check" />
          <span>Ativo (inativo some do site público)</span>
        </label>
      </section>

      <!-- Dados privados -->
      <section class="card stack">
        <p class="section-title">Só você vê</p>
        <div class="grid2">
          <label class="field"><span>Contato</span><input v-model="form.contact" placeholder="Nome da pessoa" /></label>
          <label class="field"><span>Telefone</span><input v-model="form.phone" inputmode="tel" /></label>
        </div>
        <label class="field"><span>Anotações internas</span><textarea v-model="form.privateNote" rows="2" /></label>
      </section>

      <button class="btn block" :disabled="uploading">{{ existing ? 'Salvar alterações' : 'Cadastrar patrocinador' }}</button>
    </form>

    <!-- Aportes: só depois de cadastrado -->
    <section v-if="existing" class="card stack">
      <div class="row between">
        <p class="section-title">Aportes</p>
        <strong>{{ brl(summary.total) }}</strong>
      </div>

      <div v-if="summary.total" class="grid3">
        <div v-for="(label, key) in PURPOSES" :key="key">
          <p class="muted">{{ label }}</p>
          <p><strong>{{ brl(summary.byPurpose[key]) }}</strong></p>
        </div>
      </div>

      <p v-if="!summary.contributions.length" class="muted">Nenhum aporte registrado ainda.</p>
      <div class="list">
        <div v-for="c in summary.contributions" :key="c.id" class="list-item">
          <div class="grow">
            <p>
              <strong>{{ brl(c.amount) }}</strong>
              · {{ PURPOSES[c.purpose] || 'Gastos gerais' }}<template v-if="c.championshipId && champName(c.championshipId)"> · {{ champName(c.championshipId) }}</template>
            </p>
            <p class="muted">{{ c.date ? formatDateFull(c.date) : '' }}<template v-if="c.note"> · {{ c.note }}</template></p>
          </div>
          <button type="button" class="btn small" :class="removingGift === c.id ? 'danger' : 'secondary'" @click="removeGift(c.id)">
            {{ removingGift === c.id ? 'Confirmar' : 'Excluir' }}
          </button>
        </div>
      </div>

      <form class="stack gift-form" @submit.prevent="addGift">
        <p class="section-title">Registrar aporte</p>
        <div class="grid2">
          <label class="field"><span>Valor (R$)</span><input v-model="gift.amount" type="number" min="0" step="0.01" inputmode="decimal" required /></label>
          <label class="field"><span>Data</span><input v-model="gift.date" type="date" required /></label>
        </div>
        <label class="field">
          <span>Para quê?</span>
          <select v-model="gift.purpose">
            <option v-for="(label, key) in PURPOSES" :key="key" :value="key">{{ label }}</option>
          </select>
        </label>
        <label v-if="gift.purpose === 'campeonato' && state.championships.length" class="field">
          <span>Qual campeonato?</span>
          <select v-model="gift.championshipId">
            <option value="">Não especificar</option>
            <option v-for="c in state.championships" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </label>
        <label class="field"><span>Observação (opcional)</span><input v-model="gift.note" placeholder="Ex.: camisas da temporada" /></label>
        <button class="btn">Registrar aporte</button>
      </form>
    </section>

    <button v-if="existing" type="button" class="btn danger block" @click="removeSponsor">
      {{ removingSponsor ? 'Toque de novo para excluir de vez' : 'Excluir patrocinador' }}
    </button>
  </div>
</template>
