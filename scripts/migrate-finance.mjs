/**
 * Migração única: move os dados financeiros que estavam DENTRO dos documentos de jogos e
 * campeonatos para as coleções privadas matchFinance e championshipFinance.
 *
 *   jogo:        totalCost, costType, perPlayer, payments  -> matchFinance/{matchId}
 *   campeonato:  feeMode, fee, payments                    -> championshipFinance/{champId}
 *
 * Quando rodar: ANTES de publicar as novas regras do firestore.rules (enquanto qualquer conta
 * logada ainda consegue ler e escrever). Se publicar as regras antes, entre com uma conta admin.
 *
 * Uso (Node 20.6+; as chaves VITE_FIREBASE_* vêm do .env):
 *   MIGRATE_EMAIL=conta@time.com MIGRATE_PASSWORD=senha node --env-file=.env scripts/migrate-finance.mjs
 *   ... mesmo comando com  --apply  para gravar de verdade (sem --apply só mostra o que faria)
 *
 * É seguro rodar de novo: o que já foi movido não aparece mais nos documentos antigos.
 */
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc, deleteField } from 'firebase/firestore'

const apply = process.argv.includes('--apply')
const { MIGRATE_EMAIL, MIGRATE_PASSWORD } = process.env

if (!MIGRATE_EMAIL || !MIGRATE_PASSWORD) {
  console.error('Defina MIGRATE_EMAIL e MIGRATE_PASSWORD (conta que consegue ler e escrever no Firestore).')
  process.exit(1)
}

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
})
await signInWithEmailAndPassword(getAuth(app), MIGRATE_EMAIL, MIGRATE_PASSWORD)
const db = getFirestore(app)

const jobs = [
  { source: 'matches', target: 'matchFinance', fields: ['totalCost', 'costType', 'perPlayer', 'payments'] },
  { source: 'championships', target: 'championshipFinance', fields: ['feeMode', 'fee', 'payments'] }
]

let moved = 0
for (const { source, target, fields } of jobs) {
  const snap = await getDocs(collection(db, source))
  for (const d of snap.docs) {
    const data = d.data()
    const fin = Object.fromEntries(fields.filter((f) => data[f] !== undefined).map((f) => [f, data[f]]))
    if (!Object.keys(fin).length) continue

    console.log(`${apply ? 'Movendo' : '[simulação]'} ${source}/${d.id} -> ${target}/${d.id}  (${Object.keys(fin).join(', ')})`)
    moved++
    if (!apply) continue

    // 1) grava no destino privado; 2) só então apaga do documento público
    await setDoc(doc(db, target, d.id), fin, { merge: true })
    await updateDoc(
      doc(db, source, d.id),
      Object.fromEntries(Object.keys(fin).map((f) => [f, deleteField()]))
    )
  }
}

console.log(apply ? `Pronto: ${moved} documento(s) migrado(s).` : `Simulação: ${moved} documento(s) seriam migrados. Rode com --apply.`)
process.exit(0)
