<script setup>
import { computed } from 'vue'
import { PURPOSES } from '@/utils/finance'

// Representação pública de um patrocinador: logo (ou monograma) + nome + para o que ajuda.
// Nunca mostra valores nem contatos: esses dados nem chegam ao visitante.
const props = defineProps({
  sponsor: { type: Object, required: true },
  size: { type: String, default: 'md' }, // sm | md | lg
  showSupports: { type: Boolean, default: true }
})

// Só abre links http(s); qualquer outra coisa é ignorada.
const url = computed(() => {
  const raw = (props.sponsor.website || '').trim()
  if (!raw) return null
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null
  } catch {
    return null
  }
})

const initials = computed(() => {
  const words = (props.sponsor.name || '?').split(/\s+/).filter((w) => w.length > 2 || /^\d/.test(w))
  const pick = words.length ? words : (props.sponsor.name || '?').split(/\s+/)
  return pick
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
})

// Monograma (quando não há logo): um de três visuais, sempre o mesmo para o mesmo nome
const variant = computed(() => {
  let h = 0
  for (const ch of props.sponsor.name || '') h = (h * 31 + ch.charCodeAt(0)) % 3
  return h
})

const tags = computed(() => Object.keys(PURPOSES).filter((k) => props.sponsor.supports?.[k]))
</script>

<template>
  <component
    :is="url ? 'a' : 'div'"
    class="sponsor"
    :class="[size, { featured: sponsor.featured }]"
    :href="url || undefined"
    :target="url ? '_blank' : undefined"
    :rel="url ? 'noopener noreferrer' : undefined"
  >
    <span class="plate" :class="!sponsor.logoUrl && `mono-${variant}`">
      <img v-if="sponsor.logoUrl" :src="sponsor.logoUrl" :alt="sponsor.name" loading="lazy" />
      <span v-else class="mono">{{ initials }}</span>
    </span>
    <span class="s-name">{{ sponsor.name }}</span>
    <span v-if="showSupports && tags.length" class="s-tags">
      <i v-for="t in tags" :key="t">{{ PURPOSES[t] }}</i>
    </span>
  </component>
</template>
