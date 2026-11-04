import { nextSunday, toISODate } from '@/utils/format'

// Dados de exemplo (nomes inventados) usados só na build de prévia (VITE_DEMO=1).
const addDays = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number)
  return toISODate(new Date(y, m - 1, d + n))
}

// Logos de exemplo desenhados na hora (marcas inventadas, só para a prévia).
function demoLogo(kind, bg, fg = '#ffffff') {
  const glyphs = {
    cart: `<path d="M24 32h9l8 32h30l7-22H37" /><circle cx="44" cy="76" r="5" fill="${fg}" /><circle cx="68" cy="76" r="5" fill="${fg}" />`,
    wrench: `<path d="M32 70l30-30" stroke-width="12" /><circle cx="68" cy="34" r="13" /><path d="M62 28l12 12" />`,
    bread: `<ellipse cx="50" cy="56" rx="32" ry="20" /><path d="M36 46l8 20M52 42l8 24M66 46l6 18" />`,
    scissors: `<circle cx="34" cy="70" r="9" /><circle cx="66" cy="70" r="9" /><path d="M40 62L68 24M60 62L32 24" />`,
    dumbbell: `<path d="M26 50h48M34 36v28M66 36v28M22 42v16M78 42v16" stroke-width="9" />`
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="${bg}"/><g fill="none" stroke="${fg}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">${glyphs[kind]}</g></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export function demoData() {
  const roster = [
    ['p1', 'Carlos Silva', 'Carlão'],
    ['p2', 'Rafael Santos', 'Rafa'],
    ['p3', 'Jonas Lima', 'Jonas'],
    ['p4', 'Eduardo Souza', 'Dudu'],
    ['p5', 'Marcos Oliveira', 'Marcão'],
    ['p6', 'Leonardo Costa', 'Léo'],
    ['p7', 'Tiago Alves', 'Tiago'],
    ['p8', 'Guilherme Rocha', 'Gui'],
    ['p9', 'Pedro Henrique', 'Pedrão']
  ]
  const players = Object.fromEntries(roster.map(([id, name, nickname]) => [id, { name, nickname, active: true }]))

  const ids = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => `p${from + i}`)
  const present = (list) => Object.fromEntries(list.map((id) => [id, true]))
  const paid = (list) => Object.fromEntries(list.map((id) => [id, { paid: true, amount: 15, paidAt: Date.now() }]))

  const sunday = nextSunday()
  const base = { time: '09:00', location: 'Campo do Zé', perPlayer: 15, costType: 'campo' }

  const matches = {
    m1: { ...base, date: sunday, status: 'scheduled', totalCost: 120, attendance: present(ids(1, 5)), payments: {} },
    m2: {
      ...base,
      date: addDays(sunday, -7),
      opponent: 'Vila Nova',
      status: 'played',
      scoreUs: 3,
      scoreThem: 1,
      notes: 'Dois do Rafa e um do Carlão. Segundo tempo pegado.',
      totalCost: 120,
      attendance: present(ids(1, 8)),
      payments: paid(ids(1, 6))
    },
    m3: {
      ...base,
      date: addDays(sunday, -14),
      opponent: 'Time do Bairro',
      status: 'played',
      scoreUs: 2,
      scoreThem: 2,
      notes: '',
      costType: 'ambos',
      totalCost: 135,
      attendance: present(ids(1, 9)),
      payments: paid(ids(1, 8))
    },
    m4: {
      ...base,
      date: addDays(sunday, -21),
      opponent: '',
      status: 'played',
      scoreUs: 5,
      scoreThem: 4,
      notes: 'Racha interno, time branco x time preto.',
      totalCost: 120,
      attendance: present(ids(1, 8)),
      payments: paid(ids(1, 8))
    }
  }

  const championships = {
    c1: {
      name: 'Copa Zona Leste',
      location: 'Arena Vila Esperança',
      startDate: addDays(sunday, 14),
      endDate: addDays(sunday, 56),
      status: 'open',
      feeMode: 'team',
      fee: 1000,
      notes: 'Jogos aos sábados. Chegar 30 minutos antes para o aquecimento.',
      roster: present(ids(1, 8)),
      payments: Object.fromEntries(ids(1, 5).map((id) => [id, { paid: true, amount: 62.5, paidAt: Date.now() }]))
    },
    c2: {
      name: 'Taça da Quebrada',
      location: 'Campo do Zé',
      startDate: addDays(sunday, -63),
      endDate: addDays(sunday, -35),
      status: 'finished',
      feeMode: 'player',
      fee: 40,
      notes: 'Chegamos na semifinal.',
      roster: present(ids(1, 7)),
      payments: Object.fromEntries(ids(1, 7).map((id) => [id, { paid: true, amount: 40, paidAt: Date.now() }]))
    }
  }
  matches.m2.championshipId = 'c2'

  // Valores e pagamentos ficam em coleções separadas (só admin), como no Firestore.
  const split = (collectionObj, keys) =>
    Object.fromEntries(
      Object.entries(collectionObj).map(([id, doc]) => {
        const fin = {}
        for (const k of keys) {
          if (k in doc) {
            fin[k] = doc[k]
            delete doc[k]
          }
        }
        return [id, fin]
      })
    )
  const matchFinance = split(matches, ['totalCost', 'costType', 'perPlayer', 'payments'])
  const championshipFinance = split(championships, ['feeMode', 'fee', 'payments'])

  const sup = (...keys) => Object.fromEntries(keys.map((k) => [k, true]))
  const gift = (amount, daysAgo, purpose, note = '', championshipId = '') => ({
    amount,
    date: addDays(sunday, -daysAgo),
    purpose,
    championshipId,
    note,
    createdAt: Date.now()
  })
  const sponsors = {
    s1: { name: 'Mercadinho do Zé', logoUrl: demoLogo('cart', '#e0161f'), inline: true, website: 'https://example.com', featured: true, active: true, supports: sup('uniforme', 'geral') },
    s2: { name: 'Auto Peças Leste', logoUrl: demoLogo('wrench', '#1d1d1d'), inline: true, website: 'https://example.com', featured: true, active: true, supports: sup('campeonato', 'uniforme') },
    s3: { name: 'Padaria Pão Quente', logoUrl: demoLogo('bread', '#b45309'), inline: true, website: '', featured: false, active: true, supports: sup('geral') },
    s4: { name: 'Barbearia Navalha', logoUrl: demoLogo('scissors', '#0f172a'), inline: true, website: '', featured: false, active: true, supports: sup('uniforme') },
    s5: { name: 'Studio Fit Zona Leste', logoUrl: demoLogo('dumbbell', '#15803d'), inline: true, website: 'https://example.com', featured: false, active: true, supports: sup('campeonato') },
    s6: { name: 'Oficina do Beto', logoUrl: '', inline: false, website: '', featured: false, active: true, supports: sup('geral') },
    s7: { name: 'Loja Esquina Velha', logoUrl: '', inline: false, website: '', featured: false, active: false, supports: sup('geral') }
  }
  const sponsorFinance = {
    s1: { contact: 'Seu Zé', phone: '(11) 00000-0001', privateNote: 'Prefere pagar em dinheiro, no domingo.', contributions: { k1: gift(300, 40, 'uniforme', 'Camisas da temporada'), k2: gift(150, 12, 'geral', 'Bola e água') } },
    s2: { contact: 'Marcos', phone: '(11) 00000-0002', privateNote: '', contributions: { k3: gift(300, 20, 'campeonato', 'Inscrição da Copa Zona Leste', 'c1'), k4: gift(200, 45, 'uniforme', 'Short e meião') } },
    s3: { contact: 'Dona Lúcia', phone: '(11) 00000-0003', privateNote: 'Paga todo começo de mês.', contributions: { k5: gift(100, 8, 'geral', 'Mensalidade de novembro') } },
    s4: { contact: 'Rodrigo', phone: '', privateNote: '', contributions: { k6: gift(250, 40, 'uniforme', 'Camisas da temporada') } },
    s5: { contact: 'Camila', phone: '(11) 00000-0005', privateNote: '', contributions: { k7: gift(200, 18, 'campeonato', 'Ajuda na inscrição', 'c1') } },
    s6: { contact: 'Beto', phone: '', privateNote: 'Quer a marca na camisa do goleiro.', contributions: { k8: gift(80, 15, 'geral', 'Campo do último jogo') } },
    s7: { contact: '', phone: '', privateNote: 'Parou de apoiar em outubro.', contributions: {} }
  }

  return { players, matches, photos: {}, championships, matchFinance, championshipFinance, sponsors, sponsorFinance }
}
