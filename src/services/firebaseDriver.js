/**
 * Driver Firebase (Firestore + Auth por e-mail/senha, uma conta por administrador).
 *
 * Modelo de dados (NoSQL)
 *
 *  PÚBLICO (leitura aberta, escrita só admin)
 *   players/{playerId}                 -> { name, nickname, active }
 *   matches/{matchId}                  -> { date, time, opponent, location, status, scoreUs, scoreThem,
 *                                           notes, championshipId, attendance: { [playerId]: true } }
 *   matches/{matchId}/photos/{photoId} -> { url, inline, createdAt }
 *   championships/{id}                 -> { name, location, startDate, endDate, status: open|finished,
 *                                           notes, roster: { [playerId]: true } }
 *   sponsors/{id}                      -> { name, logoUrl, inline, website, featured, active,
 *                                           supports: { campeonato, uniforme, geral } }
 *
 *  PRIVADO (leitura e escrita só admin)
 *   matchFinance/{matchId}             -> { totalCost, costType, perPlayer,
 *                                           payments: { [playerId]: { paid, amount, paidAt } } }
 *   championshipFinance/{champId}      -> { feeMode: team|player, fee,
 *                                           payments: { [playerId]: { paid, amount, paidAt } } }
 *   sponsorFinance/{sponsorId}         -> { contact, phone, privateNote,
 *                                           contributions: { [id]: { amount, date, purpose, championshipId, note } } }
 *   admins/{uid}                       -> {}   (quem tem documento aqui é administrador)
 *
 * As escritas são "fire and forget": o cache offline do Firestore atualiza a UI na hora
 * e sincroniza quando a conexão voltar. Erros são reportados via onError.
 */
import { initializeApp } from 'firebase/app'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  getDocs,
  query,
  orderBy,
  writeBatch
} from 'firebase/firestore'
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { firebaseConfig } from './config'

const withId = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }))

export function createFirebaseDriver(onError = console.error) {
  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  })

  const players = collection(db, 'players')
  const matches = collection(db, 'matches')
  const championships = collection(db, 'championships')
  const matchFinance = collection(db, 'matchFinance')
  const championshipFinance = collection(db, 'championshipFinance')
  const sponsors = collection(db, 'sponsors')
  const sponsorFinance = collection(db, 'sponsorFinance')

  const fire = (promise) => promise.catch(onError)

  return {
    mode: 'firebase',

    // Quem é admin é decidido pelas REGRAS do Firestore. Aqui só descobrimos se o documento
    // admins/{uid} existe, para o app saber se deve mostrar as ferramentas de edição.
    onAuth: (cb) =>
      onAuthStateChanged(auth, async (user) => {
        if (!user) return cb(null)
        let isAdmin = false
        try {
          isAdmin = (await getDoc(doc(db, 'admins', user.uid))).exists()
        } catch {
          isAdmin = false
        }
        cb({ email: user.email, uid: user.uid, isAdmin })
      }),
    login: (email, password) => signInWithEmailAndPassword(auth, email, password),
    logout: () => signOut(auth),

    // ---- leitura pública ----
    subscribePlayers: (cb, err = onError) =>
      onSnapshot(query(players, orderBy('name')), (s) => cb(withId(s)), err),
    subscribeMatches: (cb, err = onError) =>
      onSnapshot(query(matches, orderBy('date', 'desc')), (s) => cb(withId(s)), err),
    subscribeChampionships: (cb, err = onError) =>
      onSnapshot(query(championships, orderBy('startDate', 'desc')), (s) => cb(withId(s)), err),
    subscribeSponsors: (cb, err = onError) =>
      onSnapshot(query(sponsors, orderBy('name')), (s) => cb(withId(s)), err),
    subscribePhotos: (matchId, cb, err = onError) =>
      onSnapshot(
        query(collection(db, 'matches', matchId, 'photos'), orderBy('createdAt')),
        (s) => cb(withId(s)),
        err
      ),

    // ---- leitura privada (só admin; o app só assina quando é admin) ----
    subscribeMatchFinance: (cb, err = onError) => onSnapshot(matchFinance, (s) => cb(withId(s)), err),
    subscribeChampionshipFinance: (cb, err = onError) =>
      onSnapshot(championshipFinance, (s) => cb(withId(s)), err),
    subscribeSponsorFinance: (cb, err = onError) => onSnapshot(sponsorFinance, (s) => cb(withId(s)), err),

    // ---- escrita (só admin) ----
    savePlayer(player) {
      const { id, ...data } = player
      const ref = id ? doc(players, id) : doc(players)
      fire(setDoc(ref, data, { merge: true }))
      return ref.id
    },
    deletePlayer: (id) => fire(deleteDoc(doc(players, id))),

    saveMatch(match) {
      const { id, ...data } = match
      const ref = id ? doc(matches, id) : doc(matches)
      fire(setDoc(ref, data, { merge: true }))
      return ref.id
    },
    // Aceita caminhos com ponto, ex.: { 'attendance.abc': true }
    patchMatch: (id, patch) => fire(updateDoc(doc(matches, id), patch)),
    async deleteMatch(id) {
      try {
        const photos = await getDocs(collection(db, 'matches', id, 'photos'))
        const batch = writeBatch(db)
        photos.forEach((p) => batch.delete(p.ref))
        batch.delete(doc(matches, id))
        batch.delete(doc(matchFinance, id))
        await batch.commit()
      } catch (e) {
        onError(e)
      }
    },
    saveMatchFinance: (id, data) => fire(setDoc(doc(matchFinance, id), data, { merge: true })),
    // Mescla só o pagamento daquele jogador, sem tocar nos demais
    setMatchPayment: (id, playerId, value) =>
      fire(setDoc(doc(matchFinance, id), { payments: { [playerId]: value } }, { merge: true })),

    saveChampionship(champ) {
      const { id, ...data } = champ
      const ref = id ? doc(championships, id) : doc(championships)
      fire(setDoc(ref, data, { merge: true }))
      return ref.id
    },
    // Aceita caminhos com ponto, ex.: { 'roster.abc': true }
    patchChampionship: (id, patch) => fire(updateDoc(doc(championships, id), patch)),
    deleteChampionship(id) {
      const batch = writeBatch(db)
      batch.delete(doc(championships, id))
      batch.delete(doc(championshipFinance, id))
      return fire(batch.commit())
    },
    saveChampionshipFinance: (id, data) => fire(setDoc(doc(championshipFinance, id), data, { merge: true })),
    setChampionshipPayment: (id, playerId, value) =>
      fire(setDoc(doc(championshipFinance, id), { payments: { [playerId]: value } }, { merge: true })),

    saveSponsor(sponsor) {
      const { id, ...data } = sponsor
      const ref = id ? doc(sponsors, id) : doc(sponsors)
      fire(setDoc(ref, data, { merge: true }))
      return ref.id
    },
    deleteSponsor(id) {
      const batch = writeBatch(db)
      batch.delete(doc(sponsors, id))
      batch.delete(doc(sponsorFinance, id))
      return fire(batch.commit())
    },
    saveSponsorFinance: (id, data) => fire(setDoc(doc(sponsorFinance, id), data, { merge: true })),
    setSponsorContribution: (id, contributionId, value) =>
      fire(setDoc(doc(sponsorFinance, id), { contributions: { [contributionId]: value } }, { merge: true })),
    deleteSponsorContribution: (id, contributionId) =>
      fire(updateDoc(doc(sponsorFinance, id), { [`contributions.${contributionId}`]: deleteField() })),

    addPhoto(matchId, photo) {
      const ref = doc(collection(db, 'matches', matchId, 'photos'))
      fire(setDoc(ref, { ...photo, createdAt: Date.now() }))
      return ref.id
    },
    deletePhoto: (matchId, photoId) => fire(deleteDoc(doc(db, 'matches', matchId, 'photos', photoId)))
  }
}
