/** Resumo financeiro de uma partida. Quem paga = quem jogou (attendance). */
export function matchSummary(match) {
  const attendees = Object.entries(match.attendance || {})
    .filter(([, present]) => present)
    .map(([id]) => id)
  const payments = match.payments || {}
  const paid = attendees.filter((id) => payments[id]?.paid)
  const perPlayer = Number(match.perPlayer || 0)
  const collected = paid.reduce((sum, id) => sum + Number(payments[id]?.amount ?? perPlayer), 0)
  const expected = attendees.length * perPlayer
  return {
    attendees,
    paid,
    pending: attendees.filter((id) => !payments[id]?.paid),
    collected,
    expected,
    missing: Math.max(expected - collected, 0),
    totalCost: Number(match.totalCost || 0),
    // positivo = sobrou, negativo = faltou para cobrir o custo
    balance: collected - Number(match.totalCost || 0)
  }
}

/**
 * Quanto falta cobrar dos jogadores no modo "taxa do time":
 * taxa - patrocínio ligado ao campeonato (nunca negativo).
 * `champ.sponsorTotal` é preenchido pelo store (só admin).
 */
export function championshipToSplit(champ) {
  const fee = Number(champ.fee || 0)
  if (champ.feeMode !== 'team') return fee
  return Math.max(fee - Number(champ.sponsorTotal || 0), 0)
}

/**
 * Valor da inscrição por jogador.
 *  - feeMode 'player': a taxa já é por jogador (patrocínio não abate).
 *  - feeMode 'team'  : (taxa - patrocínio) dividida entre os inscritos (arredonda para cima, centavo).
 */
export function championshipPerPlayer(champ) {
  if (champ.feeMode !== 'team') return Number(champ.fee || 0)
  const n = Object.values(champ.roster || {}).filter(Boolean).length
  return n ? Math.ceil((championshipToSplit(champ) / n) * 100) / 100 : 0
}

/** Resumo da inscrição em um campeonato. Quem paga = quem está no elenco (roster). */
export function championshipSummary(champ) {
  const roster = Object.entries(champ.roster || {})
    .filter(([, enrolled]) => enrolled)
    .map(([id]) => id)
  const payments = champ.payments || {}
  const perPlayer = championshipPerPlayer(champ)
  const paid = roster.filter((id) => payments[id]?.paid)
  const collected = paid.reduce((sum, id) => sum + Number(payments[id]?.amount ?? perPlayer), 0)
  const fee = Number(champ.fee || 0)
  const sponsor = champ.feeMode === 'team' ? Math.min(Number(champ.sponsorTotal || 0), fee) : 0
  const toSplit = championshipToSplit(champ)
  const total = champ.feeMode === 'team' ? toSplit : fee * roster.length
  return {
    roster,
    paid,
    pending: roster.filter((id) => !payments[id]?.paid),
    perPlayer,
    fee,
    sponsor,
    toSplit,
    total,
    collected,
    missing: Math.max(total - collected, 0)
  }
}

/** Dívidas por jogador: jogos já jogados + inscrições de campeonatos. */
export function debtsByPlayer(matches, championships = []) {
  const debts = {}
  const entry = (id) => (debts[id] ||= { total: 0, matchIds: [], championshipIds: [] })

  for (const m of matches) {
    if (m.status !== 'played') continue
    const perPlayer = Number(m.perPlayer || 0)
    for (const [playerId, present] of Object.entries(m.attendance || {})) {
      if (!present || m.payments?.[playerId]?.paid) continue
      const d = entry(playerId)
      d.total += perPlayer
      d.matchIds.push(m.id)
    }
  }

  for (const c of championships) {
    const { pending, perPlayer } = championshipSummary(c)
    if (!perPlayer) continue
    for (const playerId of pending) {
      const d = entry(playerId)
      d.total += perPlayer
      d.championshipIds.push(c.id)
    }
  }
  return debts
}

/** Para que o patrocínio ajuda (rótulos usados nas telas). */
export const PURPOSES = { campeonato: 'Campeonatos', uniforme: 'Uniforme', geral: 'Gastos gerais' }

/** Aportes de um patrocinador (só admin tem esses dados). */
export function sponsorSummary(sponsor) {
  const contributions = Object.entries(sponsor.contributions || {})
    .map(([id, c]) => ({ id, ...c }))
    .sort((a, b) => ((a.date || '') < (b.date || '') ? 1 : -1))
  const byPurpose = { campeonato: 0, uniforme: 0, geral: 0 }
  let total = 0
  for (const c of contributions) {
    const amount = Number(c.amount || 0)
    total += amount
    byPurpose[c.purpose in byPurpose ? c.purpose : 'geral'] += amount
  }
  return { contributions, total, byPurpose }
}

/** Soma dos aportes de todos os patrocinadores, por destino. */
export function sponsorsTotals(sponsors) {
  const byPurpose = { campeonato: 0, uniforme: 0, geral: 0 }
  let total = 0
  for (const sp of sponsors) {
    const s = sponsorSummary(sp)
    total += s.total
    for (const k of Object.keys(byPurpose)) byPurpose[k] += s.byPurpose[k]
  }
  return { total, byPurpose }
}

/** Aportes destinados a um campeonato específico. */
export function sponsorTotalForChampionship(sponsors, championshipId) {
  let total = 0
  for (const sp of sponsors) {
    for (const c of Object.values(sp.contributions || {})) {
      if (c.purpose === 'campeonato' && c.championshipId === championshipId) total += Number(c.amount || 0)
    }
  }
  return total
}

/** Aportes ligados a um campeonato, com o nome do patrocinador (para a tela do campeonato). */
export function championshipSponsorItems(sponsors, championshipId) {
  const items = []
  for (const sp of sponsors) {
    for (const [id, c] of Object.entries(sp.contributions || {})) {
      if (c.purpose === 'campeonato' && c.championshipId === championshipId) {
        items.push({ id, sponsorId: sp.id, sponsorName: sp.name, amount: Number(c.amount || 0), date: c.date || '', note: c.note || '' })
      }
    }
  }
  return items.sort((a, b) => b.amount - a.amount)
}
