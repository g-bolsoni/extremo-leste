import { reactive, computed } from 'vue'
import { createLocalDriver } from '@/services/localDriver'
import { hasFirebase } from '@/services/config'
import { uploadPhoto } from '@/services/photoService'
import { sponsorTotalForChampionship } from '@/utils/finance'

// Campos financeiros: ficam em coleções separadas (só admin enxerga).
const MATCH_FIN = ['totalCost', 'costType', 'perPlayer', 'payments']
const CHAMP_FIN = ['feeMode', 'fee', 'payments']
// Patrocinador: aportes, contato e anotações internas nunca chegam ao visitante.
const SPONSOR_FIN = ['contributions', 'contact', 'phone', 'privateNote']

const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]))
const omit = (obj, keys) => Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.includes(k)))

const state = reactive({
  mode: 'local',
  authReady: false,
  user: null,
  ready: false,
  players: [],
  matches: [], // jogos já juntos com o financeiro (só para admin)
  championships: [],
  sponsors: [],
  photos: {},
  error: ''
})

// Dados "crus" vindos dos drivers. state.matches/championships são derivados daqui.
const raw = { matches: [], championships: [], sponsors: [], matchFin: {}, champFin: {}, sponsorFin: {} }

let driver = null
let starting = null
let publicUnsubs = []
let financeUnsubs = []
const photoUnsubs = new Map()

let resolveAuth
const authReadyPromise = new Promise((r) => (resolveAuth = r))

const fail = (e) => {
  console.error(e)
  state.error = e?.message || 'Algo deu errado. Tente novamente.'
}

export const isAdminNow = () => !!state.user?.isAdmin

/** Espera o login ser verificado (usado pelas rotas protegidas). */
export const whenAuthReady = () => Promise.race([authReadyPromise, new Promise((r) => setTimeout(r, 4000))])

/**
 * Visitante: só dados públicos (sem nenhum campo financeiro).
 * Admin: jogo/campeonato + financeiro correspondente.
 */
function rebuild() {
  const admin = isAdminNow()
  state.matches = raw.matches.map((m) => (admin ? { ...m, ...(raw.matchFin[m.id] || {}) } : omit(m, MATCH_FIN)))
  // Visitante só vê patrocinadores ativos, sem nenhum dado privado
  state.sponsors = admin
    ? raw.sponsors.map((sp) => ({ ...sp, ...(raw.sponsorFin[sp.id] || {}) }))
    : raw.sponsors.filter((sp) => sp.active !== false).map((sp) => omit(sp, SPONSOR_FIN))
  // Admin: cada campeonato carrega o total de patrocínio ligado a ele (abate a taxa do time)
  state.championships = raw.championships.map((c) =>
    admin
      ? { ...c, ...(raw.champFin[c.id] || {}), sponsorTotal: sponsorTotalForChampionship(state.sponsors, c.id) }
      : omit(c, CHAMP_FIN)
  )
}

function stopPublic() {
  publicUnsubs.forEach((u) => u())
  publicUnsubs = []
  photoUnsubs.forEach((u) => u())
  photoUnsubs.clear()
}

function startPublic() {
  stopPublic()
  let gotPlayers = false
  let gotMatches = false
  const check = () => {
    if (gotPlayers && gotMatches) state.ready = true
  }
  publicUnsubs.push(
    driver.subscribePlayers((list) => {
      state.players = list
      gotPlayers = true
      check()
    }, fail),
    driver.subscribeMatches((list) => {
      raw.matches = list
      gotMatches = true
      rebuild()
      check()
    }, fail),
    driver.subscribeChampionships((list) => {
      raw.championships = list
      rebuild()
    }, fail),
    driver.subscribeSponsors((list) => {
      raw.sponsors = list
      rebuild()
    }, fail)
  )
  // Evita loading infinito se estiver offline sem cache
  setTimeout(() => (state.ready = true), 4000)
}

/** Assina o financeiro só quando é admin; o público nunca gera pedido (nem erro de permissão). */
function syncFinance() {
  financeUnsubs.forEach((u) => u())
  financeUnsubs = []
  raw.matchFin = {}
  raw.champFin = {}
  raw.sponsorFin = {}
  if (isAdminNow()) {
    financeUnsubs.push(
      driver.subscribeMatchFinance((list) => {
        raw.matchFin = Object.fromEntries(list.map((d) => [d.id, d]))
        rebuild()
      }, fail),
      driver.subscribeChampionshipFinance((list) => {
        raw.champFin = Object.fromEntries(list.map((d) => [d.id, d]))
        rebuild()
      }, fail),
      driver.subscribeSponsorFinance((list) => {
        raw.sponsorFin = Object.fromEntries(list.map((d) => [d.id, d]))
        rebuild()
      }, fail)
    )
  }
  rebuild()
}

export function initStore() {
  if (starting) return starting
  starting = (async () => {
    try {
      if (hasFirebase) {
        const { createFirebaseDriver } = await import('@/services/firebaseDriver')
        driver = createFirebaseDriver(fail)
        state.mode = 'firebase'
      } else {
        driver = createLocalDriver()
      }
    } catch (e) {
      fail(e)
      driver = createLocalDriver()
      state.mode = 'local'
    }
    startPublic()
    driver.onAuth((user) => {
      state.user = user
      state.authReady = true
      syncFinance()
      resolveAuth()
    })
  })()
  return starting
}

export function useStore() {
  const activePlayers = computed(() => state.players.filter((p) => p.active !== false))
  const upcoming = computed(() =>
    state.matches.filter((m) => m.status !== 'played').sort((a, b) => (a.date < b.date ? -1 : 1))
  )
  const played = computed(() =>
    state.matches.filter((m) => m.status === 'played').sort((a, b) => (a.date < b.date ? 1 : -1))
  )
  const playerName = (id) => {
    const p = state.players.find((x) => x.id === id)
    return p ? p.nickname || p.name : 'Jogador removido'
  }
  const getMatch = (id) => state.matches.find((m) => m.id === id)
  const getChampionship = (id) => state.championships.find((c) => c.id === id)
  const openChampionships = computed(() => state.championships.filter((c) => c.status !== 'finished'))
  const finishedChampionships = computed(() => state.championships.filter((c) => c.status === 'finished'))

  return {
    state,
    isAdmin: computed(() => !!state.user?.isAdmin),
    isLoggedIn: computed(() => !!state.user && !state.user.local),
    activePlayers,
    upcoming,
    played,
    playerName,
    getMatch,
    getChampionship,
    openChampionships,
    finishedChampionships,

    // No modo local (sem Firebase) não há senha: o botão só alterna a visão, para testar.
    async login(email, password) {
      if (state.mode === 'local') {
        state.user = { local: true, isAdmin: true }
        syncFinance()
        return
      }
      await driver.login(email, password)
    },
    async logout() {
      if (state.mode === 'local') {
        state.user = { local: true, isAdmin: false }
        syncFinance()
        return
      }
      await driver.logout()
    },
    clearError: () => (state.error = ''),

    // Jogadores
    savePlayer: (player) => driver.savePlayer(player),
    removePlayer: (id) => driver.deletePlayer(id),

    // Partidas: o que é financeiro vai para a coleção privada
    saveMatch(match) {
      const fin = pick(match, MATCH_FIN)
      if (fin.payments && !Object.keys(fin.payments).length) delete fin.payments
      const id = driver.saveMatch(omit(match, MATCH_FIN))
      if (Object.keys(fin).length) driver.saveMatchFinance(id, fin)
      return id
    },
    removeMatch: (id) => driver.deleteMatch(id),
    setAttendance: (matchId, playerId, present) =>
      driver.patchMatch(matchId, { [`attendance.${playerId}`]: present }),
    setPaid: (matchId, playerId, paid, amount) =>
      driver.setMatchPayment(matchId, playerId, { paid, amount: Number(amount || 0), paidAt: paid ? Date.now() : null }),
    saveResult: (matchId, { scoreUs, scoreThem, notes }) =>
      driver.patchMatch(matchId, { status: 'played', scoreUs, scoreThem, notes: notes || '' }),
    reopenMatch: (matchId) => driver.patchMatch(matchId, { status: 'scheduled' }),

    // Campeonatos
    saveChampionship(champ) {
      const fin = pick(champ, CHAMP_FIN)
      if (fin.payments && !Object.keys(fin.payments).length) delete fin.payments
      const id = driver.saveChampionship(omit(champ, [...CHAMP_FIN, 'sponsorTotal']))
      if (Object.keys(fin).length) driver.saveChampionshipFinance(id, fin)
      return id
    },
    removeChampionship: (id) => driver.deleteChampionship(id),
    setChampionshipStatus: (id, status) => driver.patchChampionship(id, { status }),
    // Inscreve / retira jogadores. Aceita um id ou uma lista de ids.
    setRoster(champId, playerIds, enrolled) {
      const ids = [].concat(playerIds)
      driver.patchChampionship(champId, Object.fromEntries(ids.map((id) => [`roster.${id}`, enrolled])))
    },
    setChampionshipPaid: (champId, playerId, paid, amount) =>
      driver.setChampionshipPayment(champId, playerId, {
        paid,
        amount: Number(amount || 0),
        paidAt: paid ? Date.now() : null
      }),

    // Patrocinadores: logo, nome e destino são públicos; aportes e contato são privados
    getSponsor: (id) => state.sponsors.find((x) => x.id === id),
    saveSponsor(sponsor) {
      const fin = pick(sponsor, SPONSOR_FIN)
      if (fin.contributions && !Object.keys(fin.contributions).length) delete fin.contributions
      const id = driver.saveSponsor(omit(sponsor, SPONSOR_FIN))
      if (Object.keys(fin).length) driver.saveSponsorFinance(id, fin)
      return id
    },
    removeSponsor: (id) => driver.deleteSponsor(id),
    addContribution(sponsorId, { amount, date, purpose, championshipId, note }) {
      const cid = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`
      driver.setSponsorContribution(sponsorId, cid, {
        amount: Number(amount) || 0,
        date,
        purpose,
        championshipId: purpose === 'campeonato' ? championshipId || '' : '',
        note: (note || '').trim(),
        createdAt: Date.now()
      })
    },
    removeContribution: (sponsorId, contributionId) => driver.deleteSponsorContribution(sponsorId, contributionId),

    // Fotos
    watchPhotos(matchId) {
      if (photoUnsubs.has(matchId)) return
      photoUnsubs.set(
        matchId,
        driver.subscribePhotos(matchId, (list) => (state.photos[matchId] = list), fail)
      )
    },
    unwatchPhotos(matchId) {
      photoUnsubs.get(matchId)?.()
      photoUnsubs.delete(matchId)
    },
    async addPhotos(matchId, files) {
      for (const file of files) {
        try {
          driver.addPhoto(matchId, await uploadPhoto(file))
        } catch (e) {
          fail(e)
        }
      }
    },
    removePhoto: (matchId, photoId) => driver.deletePhoto(matchId, photoId)
  }
}
