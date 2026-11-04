<script setup>
// Skyline de quebrada: prédios/casas empilhados com janelas acesas em vermelho.
// Gerado de forma determinística (sempre igual) para não "piscar" entre renders.
function build(seed, minH, maxH) {
  let s = seed
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  const blocks = []
  const windows = []
  let x = -4
  while (x < 600) {
    const w = 16 + Math.floor(rnd() * 20)
    const h = minH + Math.floor(rnd() * (maxH - minH))
    blocks.push({ x, y: 120 - h, w: w + 1, h })
    for (let wy = 120 - h + 6; wy < 112; wy += 9) {
      for (let wx = x + 4; wx < x + w - 4; wx += 8) {
        if (rnd() > 0.74) windows.push({ x: wx, y: wy })
      }
    }
    x += w
  }
  return { blocks, windows }
}

const back = build(7, 40, 100)
const front = build(23, 20, 62)
</script>

<template>
  <svg viewBox="0 0 600 120" preserveAspectRatio="xMidYMax slice" aria-hidden="true" class="skyline">
    <g fill="#2a0d0f">
      <rect v-for="(b, i) in back.blocks" :key="'b' + i" :x="b.x" :y="b.y" :width="b.w" :height="b.h" />
    </g>
    <g fill="#e0161f" opacity=".55">
      <rect v-for="(w, i) in back.windows" :key="'bw' + i" :x="w.x" :y="w.y" width="3" height="4" />
    </g>
    <g fill="#000">
      <rect v-for="(b, i) in front.blocks" :key="'f' + i" :x="b.x" :y="b.y" :width="b.w" :height="b.h" />
    </g>
    <g fill="#e0161f" opacity=".9">
      <rect v-for="(w, i) in front.windows" :key="'fw' + i" :x="w.x" :y="w.y" width="3" height="4" />
    </g>
  </svg>
</template>
