<script setup>
// Favela de fundo: casas de laje coladas umas nas outras, caixas d'água, antenas, fios e janelas acesas.
// Gerado de forma determinística (sempre igual) para não "piscar" entre renders.
const W = 600
const H = 170

function layer(seed, { minH, maxH, minW, maxW, slope = 0, tanks = 0.25, antennas = 0.18, lit = 0.26 }) {
  let s = seed
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  const houses = []
  const windows = []
  const doors = []
  const tops = []
  let x = -6
  while (x < W + 6) {
    const w = minW + Math.floor(rnd() * (maxW - minW))
    const h = minH + Math.floor(rnd() * (maxH - minH)) + Math.round((x / W) * slope)
    const y = H - h
    const house = { x, y, w: w + 1, h, tank: null, antenna: null }
    if (rnd() < tanks && w > 18) house.tank = { x: x + 3 + Math.floor(rnd() * (w - 16)), w: 9 }
    if (rnd() < antennas) house.antenna = { x: x + 3 + Math.floor(rnd() * (w - 6)), h: 8 + Math.floor(rnd() * 9) }
    houses.push(house)
    tops.push({ x: x + w / 2, y })
    for (let wy = y + 7; wy < H - 10; wy += 11) {
      for (let wx = x + 4; wx < x + w - 5; wx += 9) {
        if (rnd() < lit) windows.push({ x: wx, y: wy, hot: rnd() > 0.85 })
      }
    }
    if (rnd() < 0.5 && w > 14) doors.push({ x: x + Math.floor(w / 2) - 2, y: H - 11 })
    x += w
  }
  return { houses, windows, doors, tops }
}

const back = layer(11, { minH: 60, maxH: 100, minW: 14, maxW: 30, slope: 40, tanks: 0.2, antennas: 0.1, lit: 0.12 })
const mid = layer(7, { minH: 44, maxH: 82, minW: 16, maxW: 34, slope: 22 })
const front = layer(23, { minH: 24, maxH: 58, minW: 18, maxW: 38, tanks: 0.3, antennas: 0.25, lit: 0.3 })

// Fios entre os topos das casas da frente (com um "barrigão" no meio)
const wires = []
for (let i = 0; i < front.tops.length - 3; i += 2) {
  const a = front.tops[i]
  const b = front.tops[i + 2]
  wires.push(`M${a.x} ${a.y - 6} Q${(a.x + b.x) / 2} ${Math.max(a.y, b.y) + 6} ${b.x} ${b.y - 6}`)
}
</script>

<template>
  <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="xMidYMax slice" aria-hidden="true" class="skyline">
    <!-- lua grande, vermelha, atrás do morro -->
    <circle cx="470" cy="50" r="34" fill="#e0161f" opacity=".3" />

    <!-- morro ao fundo -->
    <g fill="#3a1216">
      <g v-for="(b, i) in back.houses" :key="'bk' + i">
        <rect :x="b.x" :y="b.y" :width="b.w" :height="b.h" />
        <rect :x="b.x - 1" :y="b.y - 2" :width="b.w + 2" height="2" />
        <rect v-if="b.tank" :x="b.tank.x" :y="b.y - 9" :width="b.tank.w" height="7" rx="1.5" />
      </g>
    </g>
    <g fill="#e0161f" opacity=".4">
      <rect v-for="(w, i) in back.windows" :key="'bw' + i" :x="w.x" :y="w.y" width="3" height="4" />
    </g>

    <!-- meio -->
    <g fill="#220d10">
      <g v-for="(b, i) in mid.houses" :key="'md' + i">
        <rect :x="b.x" :y="b.y" :width="b.w" :height="b.h" />
        <rect :x="b.x - 1" :y="b.y - 2" :width="b.w + 2" height="2" />
        <rect v-if="b.tank" :x="b.tank.x" :y="b.y - 10" :width="b.tank.w" height="8" rx="1.5" />
      </g>
    </g>
    <g fill="#e0161f" opacity=".7">
      <rect v-for="(w, i) in mid.windows" :key="'mw' + i" :x="w.x" :y="w.y" width="3" height="4" />
    </g>

    <!-- frente -->
    <g fill="#000">
      <g v-for="(b, i) in front.houses" :key="'ft' + i">
        <rect :x="b.x" :y="b.y" :width="b.w" :height="b.h" />
        <rect :x="b.x - 1" :y="b.y - 2" :width="b.w + 2" height="2" />
        <g v-if="b.tank">
          <rect :x="b.tank.x" :y="b.y - 11" :width="b.tank.w" height="9" rx="2" />
          <rect :x="b.tank.x + 1" :y="b.y - 13" :width="b.tank.w - 2" height="2" />
        </g>
      </g>
    </g>
    <g stroke="#000" stroke-width="1" fill="none">
      <template v-for="(b, i) in front.houses" :key="'an' + i">
        <path v-if="b.antenna" :d="`M${b.antenna.x} ${b.y - 2} V${b.y - 2 - b.antenna.h} M${b.antenna.x - 3} ${b.y - 2 - b.antenna.h + 3} H${b.antenna.x + 3}`" />
      </template>
      <path v-for="(d, i) in wires" :key="'wr' + i" :d="d" opacity=".85" />
    </g>
    <g>
      <rect v-for="(w, i) in front.windows" :key="'fw' + i" :x="w.x" :y="w.y" width="3" height="4" :fill="w.hot ? '#ffb020' : '#e0161f'" opacity=".95" />
      <rect v-for="(d, i) in front.doors" :key="'dr' + i" :x="d.x" :y="d.y" width="4" height="11" fill="#2a0d0f" />
    </g>
  </svg>
</template>