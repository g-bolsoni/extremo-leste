// Na build de prévia o Firebase não é incluído (o app roda em modo local).
export function createFirebaseDriver() {
  throw new Error('Firebase não está disponível na prévia.')
}
