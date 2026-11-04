const pad = (n) => String(n).padStart(2, '0')

export const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Próximo domingo (se hoje é domingo, devolve hoje). */
export function nextSunday(from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7))
  return toISODate(d)
}

export const formatDateLong = (iso) =>
  parseISODate(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })

export const formatDateShort = (iso) =>
  parseISODate(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

export const formatDateFull = (iso) => parseISODate(iso).toLocaleDateString('pt-BR')

export const brl = (value) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const isPast = (iso) => iso < toISODate(new Date())
