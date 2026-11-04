<script setup>
defineProps({ size: { type: Number, default: 40 } })
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 100 100" role="img" aria-label="Extremo Leste" class="el-logo">
    <circle cx="50" cy="50" r="47" fill="#0b0b0b" stroke="#f3f1ee" stroke-width="3" />
    <circle cx="50" cy="50" r="40" fill="none" stroke="#e0161f" stroke-width="1.6" />
    <g transform="translate(25 36) scale(.8) skewX(-10)">
      <path transform="translate(2.5 2.5)" fill="#e0161f" d="M0 0H34V8H9V16H28V24H9V32H34V40H0Z M40 0H49V32H70V40H40Z" />
      <path fill="#f3f1ee" d="M0 0H34V8H9V16H28V24H9V32H34V40H0Z M40 0H49V32H70V40H40Z" />
    </g>
  </svg>
</template>
