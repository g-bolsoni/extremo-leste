import sharp from 'sharp'
import { readFileSync } from 'node:fs'

const svg = readFileSync(new URL('../public/favicon.svg', import.meta.url))
const out = (name) => new URL(`../public/${name}`, import.meta.url).pathname
const BG = '#0b0b0b'

await sharp(svg).resize(192, 192).png().toFile(out('pwa-192x192.png'))
await sharp(svg).resize(512, 512).png().toFile(out('pwa-512x512.png'))

// Ícone "maskable" / apple-touch: fundo cheio + logo reduzido (zona segura)
async function fullBleed(size, logoSize, file) {
  const logo = await sharp(svg).resize(logoSize, logoSize).png().toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(out(file))
}
await fullBleed(512, 360, 'pwa-maskable-512x512.png')
await fullBleed(180, 150, 'apple-touch-icon.png')

console.log('Ícones gerados em /public')
