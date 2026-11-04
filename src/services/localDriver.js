/**
 * Driver local (localStorage). Usado quando o Firebase não está configurado.
 * Implementa a mesma interface do firebaseDriver, então a UI não muda.
 * Atenção: os dados ficam só neste aparelho/navegador.
 */
import { demoData } from './demo'

const KEY = 'futebol-domingo:v1'
const listeners = new Set()

const empty = () => ({
  players: {},
  matches: {},
  photos: {},
  championships: {},
  matchFinance: {},
  championshipFinance: {},
  sponsors: {},
  sponsorFinance: {}
})

// Se o navegador bloquear o localStorage (aba anônima, iframe), usa memória.
const canStore = (() => {
  try {
    localStorage.setItem('__fd', '1')
    localStorage.removeItem('__fd')
    return true
  } catch {
    return false
  }
})()
let mem = null

function readRaw() {
  if (!canStore) return mem
  try {
    return localStorage.getItem(KEY)
  } catch {
    return mem
  }
}

function writeRaw(value) {
  mem = value
  if (!canStore) return
  try {
    localStorage.setItem(KEY, value)
  } catch {
    throw new Error('Armazenamento local cheio. Configure o Firebase/Cloudinary para guardar mais fotos.')
  }
}

function load() {
  const raw = readRaw()
  if (raw) {
    try {
      return { ...empty(), ...JSON.parse(raw) }
    } catch {
      /* dados corrompidos: recomeça */
    }
  }
  if (import.meta.env.VITE_DEMO) {
    const demo = demoData()
    writeRaw(JSON.stringify(demo))
    return demo
  }
  return empty()
}

function save(db) {
  writeRaw(JSON.stringify(db))
  listeners.forEach((fn) => fn())
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) listeners.forEach((fn) => fn())
  })
}

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`)

function subscribe(select, cb) {
  const run = () => cb(select(load()))
  listeners.add(run)
  run()
  return () => listeners.delete(run)
}

function setPath(obj, path, value) {
  const keys = path.split('.')
  let cur = obj
  for (let i = 0; i < keys.length - 1; i++) {
    if (typeof cur[keys[i]] !== 'object' || cur[keys[i]] === null) cur[keys[i]] = {}
    cur = cur[keys[i]]
  }
  cur[keys[keys.length - 1]] = value
}

const toList = (map) => Object.entries(map).map(([id, v]) => ({ id, ...v }))

export function createLocalDriver() {
  return {
    mode: 'local',

    // Modo local não tem senha: o store alterna entre "visão pública" e "admin".
    // O app sempre abre como visitante; a visão de admin só liga pela tela /admin.
    onAuth(cb) {
      // Só a prévia da área privada (VITE_PREVIEW_ROLE=admin) já abre como admin.
      cb({ local: true, isAdmin: import.meta.env.VITE_PREVIEW_ROLE === 'admin' })
      return () => {}
    },
    async login() {},
    async logout() {},

    subscribePlayers(cb) {
      return subscribe((db) => toList(db.players).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')), cb)
    },
    subscribeMatches(cb) {
      return subscribe((db) => toList(db.matches).sort((a, b) => (a.date < b.date ? 1 : -1)), cb)
    },
    subscribeChampionships(cb) {
      return subscribe(
        (db) => toList(db.championships).sort((a, b) => ((a.startDate || '') < (b.startDate || '') ? 1 : -1)),
        cb
      )
    },
    subscribeMatchFinance(cb) {
      return subscribe((db) => toList(db.matchFinance), cb)
    },
    subscribeChampionshipFinance(cb) {
      return subscribe((db) => toList(db.championshipFinance), cb)
    },
    subscribeSponsors(cb) {
      return subscribe((db) => toList(db.sponsors).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR')), cb)
    },
    subscribeSponsorFinance(cb) {
      return subscribe((db) => toList(db.sponsorFinance), cb)
    },
    subscribePhotos(matchId, cb) {
      return subscribe(
        (db) => toList(db.photos[matchId] || {}).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)),
        cb
      )
    },

    savePlayer(player) {
      const db = load()
      const id = player.id || uid()
      const { id: _omit, ...data } = player
      db.players[id] = { ...(db.players[id] || {}), ...data }
      save(db)
      return id
    },
    deletePlayer(id) {
      const db = load()
      delete db.players[id]
      save(db)
    },

    saveMatch(match) {
      const db = load()
      const id = match.id || uid()
      const { id: _omit, ...data } = match
      db.matches[id] = { ...(db.matches[id] || {}), ...data }
      save(db)
      return id
    },
    patchMatch(id, patch) {
      const db = load()
      if (!db.matches[id]) return
      for (const [path, value] of Object.entries(patch)) setPath(db.matches[id], path, value)
      save(db)
    },
    deleteMatch(id) {
      const db = load()
      delete db.matches[id]
      delete db.photos[id]
      delete db.matchFinance[id]
      save(db)
    },
    saveMatchFinance(id, data) {
      const db = load()
      db.matchFinance[id] = { ...(db.matchFinance[id] || {}), ...data }
      save(db)
    },
    setMatchPayment(id, playerId, value) {
      const db = load()
      db.matchFinance[id] = db.matchFinance[id] || {}
      setPath(db.matchFinance[id], `payments.${playerId}`, value)
      save(db)
    },

    saveChampionship(champ) {
      const db = load()
      const id = champ.id || uid()
      const { id: _omit, ...data } = champ
      db.championships[id] = { ...(db.championships[id] || {}), ...data }
      save(db)
      return id
    },
    patchChampionship(id, patch) {
      const db = load()
      if (!db.championships[id]) return
      for (const [path, value] of Object.entries(patch)) setPath(db.championships[id], path, value)
      save(db)
    },
    deleteChampionship(id) {
      const db = load()
      delete db.championships[id]
      delete db.championshipFinance[id]
      save(db)
    },
    saveChampionshipFinance(id, data) {
      const db = load()
      db.championshipFinance[id] = { ...(db.championshipFinance[id] || {}), ...data }
      save(db)
    },
    setChampionshipPayment(id, playerId, value) {
      const db = load()
      db.championshipFinance[id] = db.championshipFinance[id] || {}
      setPath(db.championshipFinance[id], `payments.${playerId}`, value)
      save(db)
    },

    saveSponsor(sponsor) {
      const db = load()
      const id = sponsor.id || uid()
      const { id: _omit, ...data } = sponsor
      db.sponsors[id] = { ...(db.sponsors[id] || {}), ...data }
      save(db)
      return id
    },
    deleteSponsor(id) {
      const db = load()
      delete db.sponsors[id]
      delete db.sponsorFinance[id]
      save(db)
    },
    saveSponsorFinance(id, data) {
      const db = load()
      db.sponsorFinance[id] = { ...(db.sponsorFinance[id] || {}), ...data }
      save(db)
    },
    setSponsorContribution(id, contributionId, value) {
      const db = load()
      db.sponsorFinance[id] = db.sponsorFinance[id] || {}
      setPath(db.sponsorFinance[id], `contributions.${contributionId}`, value)
      save(db)
    },
    deleteSponsorContribution(id, contributionId) {
      const db = load()
      if (db.sponsorFinance[id]?.contributions) delete db.sponsorFinance[id].contributions[contributionId]
      save(db)
    },

    addPhoto(matchId, photo) {
      const db = load()
      const id = uid()
      db.photos[matchId] = { ...(db.photos[matchId] || {}), [id]: { ...photo, createdAt: Date.now() } }
      save(db)
      return id
    },
    deletePhoto(matchId, photoId) {
      const db = load()
      if (db.photos[matchId]) delete db.photos[matchId][photoId]
      save(db)
    }
  }
}
