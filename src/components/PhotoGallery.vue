<script setup>
import { ref } from 'vue'
import { thumbUrl } from '@/services/photoService'

// readonly: visitante só olha (sem adicionar nem excluir)
defineProps({ photos: { type: Array, default: () => [] }, busy: Boolean, readonly: Boolean })
const emit = defineEmits(['add', 'remove'])

const input = ref(null)
const open = ref(null)

function onPick(e) {
  const files = [...e.target.files]
  if (files.length) emit('add', files)
  e.target.value = ''
}
</script>

<template>
  <div class="stack">
    <div class="row between">
      <p class="section-title">Fotos ({{ photos.length }})</p>
      <template v-if="!readonly">
        <button class="btn small secondary" :disabled="busy" @click="input.click()">{{ busy ? 'Enviando…' : '+ Adicionar' }}</button>
        <input ref="input" type="file" accept="image/*" multiple hidden @change="onPick" />
      </template>
    </div>

    <p v-if="!photos.length" class="muted">Nenhuma foto ainda.</p>
    <div v-else class="photo-grid">
      <button v-for="p in photos" :key="p.id" @click="open = p">
        <img :src="thumbUrl(p)" alt="Foto do jogo" loading="lazy" />
      </button>
    </div>

    <div v-if="open" class="lightbox" @click.self="open = null">
      <img :src="open.url" alt="Foto do jogo" />
      <div class="row">
        <button v-if="!readonly" class="btn danger" @click="emit('remove', open.id); open = null">Excluir</button>
        <button class="btn secondary" @click="open = null">Fechar</button>
      </div>
    </div>
  </div>
</template>
