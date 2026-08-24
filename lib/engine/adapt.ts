import type { ISODate, Session } from './types'

/**
 * ADAPTATION AUTOMATIQUE
 *
 * Après chaque séance validée :
 *   RPE >= 8, fatigue >= 8 ou douleur signalée → les 2 séances suivantes à 85 %
 *   RPE <= 4 et fatigue <= 4 sans douleur      → les 3 suivantes à 105 %
 *
 * Jamais plus, jamais de changement brutal, et jamais deux fois sur la même
 * séance : une séance déjà adaptée est laissée telle quelle.
 */

export const HARD_FACTOR = 0.85
export const EASY_FACTOR = 1.05
export const HARD_SESSIONS = 2
export const EASY_SESSIONS = 3

export interface AdaptInput {
  /** Date de la séance qui vient d'être validée. */
  date: ISODate
  sessionId: string
  rpe: number | null
  fatigue: number | null
  pain?: string | null
}

export interface AdaptResult {
  sessions: Session[]
  /** Séances effectivement modifiées. */
  changed: string[]
  direction: 'down' | 'up' | 'none'
}

export function adapt(sessions: Session[], input: AdaptInput): AdaptResult {
  const { date, rpe, fatigue, pain } = input
  const hasPain = !!pain?.trim()
  const hard = (rpe ?? 0) >= 8 || (fatigue ?? 0) >= 8 || hasPain
  const easy = rpe !== null && fatigue !== null && rpe <= 4 && fatigue <= 4 && !hasPain

  if (!hard && !easy) return { sessions, changed: [], direction: 'none' }

  const targets = sessions
    .filter(
      (x) =>
        x.date > date &&
        x.status === 'planned' &&
        x.type !== 'REST' &&
        !x.adapted, // déjà adaptée : on ne composé pas les facteurs
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, hard ? HARD_SESSIONS : EASY_SESSIONS)
    .map((x) => x.id)

  if (targets.length === 0) return { sessions, changed: [], direction: hard ? 'down' : 'up' }

  const factor = hard ? HARD_FACTOR : EASY_FACTOR
  const reason = hard
    ? `volume réduit de ${Math.round((1 - HARD_FACTOR) * 100)} % suite à une séance à RPE ${rpe ?? '?'}${hasPain ? ' et une douleur signalée' : ''}.`
    : 'légèrement relevé, la dernière séance est passée facilement.'

  const next = sessions.map((x) => {
    if (!targets.includes(x.id)) return x
    return {
      ...x,
      duration: Math.round(x.duration * factor),
      volumeFactor: factor,
      adapted: hard ? 'allegee' : 'légèrement relevée',
      goal: x.goal ? `${x.goal} — ${reason}` : reason,
    }
  })

  return { sessions: next, changed: targets, direction: hard ? 'down' : 'up' }
}

/**
 * Nombre de séries à conserver pour un exercice, une fois le facteur de volume
 * appliqué. On retire des séries, on ne touche jamais à la technique.
 */
export function adaptedSets(sets: number, factor: number | null | undefined): number {
  if (!factor || factor === 1) return sets
  return Math.max(1, Math.round(sets * factor))
}
