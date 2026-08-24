/**
 * FILE D'ATTENTE HORS LIGNE
 *
 * Une séance validée sans réseau ne doit pas être perdue. Elle part dans une
 * file locale, et repart au serveur dès le retour du réseau.
 *
 * La logique de file est pure et testée ici ; le stockage IndexedDB vit dans
 * `storage.ts`. Séparer les deux permet de tester l'ordre, la déduplication
 * et les tentatives sans navigateur.
 */

export type MutationKind = 'finishSession' | 'wellness' | 'weight'

export interface PendingMutation {
  /** Identifiant stable : rejouer deux fois la même mutation ne crée qu'une écriture. */
  id: string
  kind: MutationKind
  payload: unknown
  createdAt: number
  attempts: number
  lastError?: string
}

/** Au-delà, on cesse de réessayer automatiquement et on le dit à l'athlète. */
export const MAX_ATTEMPTS = 5

export function makeMutation(
  kind: MutationKind,
  payload: unknown,
  id: string,
  now = Date.now(),
): PendingMutation {
  return { id, kind, payload, createdAt: now, attempts: 0 }
}

/**
 * Ajoute une mutation à la file. Une mutation portant le même identifiant
 * remplace la précédente : deux validations de la même séance ne doivent pas
 * produire deux écritures.
 */
export function enqueue(queue: PendingMutation[], mutation: PendingMutation): PendingMutation[] {
  const without = queue.filter((m) => m.id !== mutation.id)
  return [...without, mutation].sort((a, b) => a.createdAt - b.createdAt)
}

export function dequeue(queue: PendingMutation[], id: string): PendingMutation[] {
  return queue.filter((m) => m.id !== id)
}

/** Marque un échec. La mutation reste en file tant qu'elle a des tentatives. */
export function markFailure(
  queue: PendingMutation[],
  id: string,
  error: string,
): PendingMutation[] {
  return queue.map((m) =>
    m.id === id ? { ...m, attempts: m.attempts + 1, lastError: error } : m,
  )
}

/** Mutations encore rejouables, dans l'ordre où elles ont été créées. */
export function replayable(queue: PendingMutation[]): PendingMutation[] {
  return queue
    .filter((m) => m.attempts < MAX_ATTEMPTS)
    .sort((a, b) => a.createdAt - b.createdAt)
}

/** Mutations bloquées : elles demandent une intervention, pas un nouvel essai. */
export function blocked(queue: PendingMutation[]): PendingMutation[] {
  return queue.filter((m) => m.attempts >= MAX_ATTEMPTS)
}

/**
 * Une erreur réseau se réessaie ; une erreur métier non. Renvoyer une séance
 * refusée par la validation cinq fois de suite ne la fera pas passer.
 */
export function isRetryable(error: unknown): boolean {
  if (error instanceof TypeError) return true // fetch échoue hors ligne avec un TypeError
  const message = error instanceof Error ? error.message : String(error)
  return /network|fetch|timeout|offline|failed to fetch|econnrefused/i.test(message)
}

export function summary(queue: PendingMutation[]): string | null {
  const pending = replayable(queue).length
  const stuck = blocked(queue).length
  if (pending === 0 && stuck === 0) return null
  if (stuck > 0 && pending === 0)
    return `${stuck} enregistrement${stuck > 1 ? 's' : ''} bloqué${stuck > 1 ? 's' : ''} : ouvre la séance pour corriger la saisie.`
  return `${pending} enregistrement${pending > 1 ? 's' : ''} en attente de réseau.`
}
