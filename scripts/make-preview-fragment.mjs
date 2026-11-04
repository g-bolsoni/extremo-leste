// Converte dist-preview/<nome>/index.html em um fragmento (sem doctype/html/head/body),
// formato aceito para publicar como página hospedada.
//   node scripts/make-preview-fragment.mjs publico   -> dist-preview/extremo-leste-publico.html
//   node scripts/make-preview-fragment.mjs privado   -> dist-preview/extremo-leste-privado.html
import { readFileSync, writeFileSync } from 'node:fs'

const name = process.argv[2]
const titles = { publico: 'Extremo Leste Público', privado: 'Extremo Leste Privado' }
if (!titles[name]) {
  console.error('Use: node scripts/make-preview-fragment.mjs publico|privado')
  process.exit(1)
}

const dir = new URL('../dist-preview/', import.meta.url)
let html = readFileSync(new URL(`${name}/index.html`, dir), 'utf8')

html = html
  .replace(/<!doctype[^>]*>/i, '')
  .replace(/<\/?(html|head|body)[^>]*>/gi, '')
  .replace(/<meta\s+(charset|name="viewport"|name="theme-color"|name="description")[^>]*>/gi, '')
  .replace(/<link\s+rel="(icon|apple-touch-icon)"[^>]*>/gi, '')

html = `<title>${titles[name]}</title>\n${html.replace(/<title>.*?<\/title>/i, '').trim()}\n`
writeFileSync(new URL(`extremo-leste-${name}.html`, dir), html)
console.log(`Fragmento ${name}: ${(html.length / 1024).toFixed(0)} KB`)
