import { pace, sum } from './math'
import type { AthleteState, ISODate, Session } from './types'

/**
 * RÉSUMÉ DE SÉANCE
 * Comparaison avec la séance précédente du même type. Sans précédent, on le
 * dit — on ne compare pas à une moyenne inventée.
 */

export interface Metric {
  label: string
  value: string
  /** Écart en % avec la séance précédente. null quand il n'y a rien à comparer. */
  delta: number | null
  /** true quand une hausse est une bonne nouvelle. */
  higherIsBetter: boolean
}

export interface SessionSummary {
  metrics: Metric[]
  /** Date de la séance servant de comparaison. */
  previousDate: ISODate | null
  volumeLabel: string
}

const delta = (now: number, before: number): number | null =>
  before > 0 ? Math.round(((now - before) / before) * 100) : null

/** Séance précédente du même type, hors celle qu'on vient de valider. */
export function previousOfType(state: AthleteState, session: Session): Session | null {
  const candidates = state.sessions
    .filter(
      (x) =>
        x.status === 'done' &&
        x.id !== session.id &&
        x.type === session.type &&
        x.date <= session.date,
    )
    .sort((a, b) => a.date.localeCompare(b.date))
  return candidates[candidates.length - 1] ?? null
}

export function summarize(state: AthleteState, session: Session): SessionSummary {
  const log = session.log ?? {}
  const previous = previousOfType(state, session)
  const before = previous?.log ?? null
  const metrics: Metric[] = []

  if (session.kind === 'run') {
    const km = log.km ?? 0
    const minutes = log.minutes ?? 0
    metrics.push({
      label: 'Distance',
      value: `${km.toFixed(2)} km`,
      delta: before ? delta(km, before.km ?? 0) : null,
      higherIsBetter: true,
    })
    if (minutes > 0 && km > 0) {
      const now = minutes / km
      const then = before?.minutes && before?.km ? before.minutes / before.km : 0
      metrics.push({
        label: 'Allure',
        value: `${pace(now, 1)}/km`,
        // une allure qui baisse est une allure qui progresse
        delta: then > 0 ? -(delta(now, then) ?? 0) : null,
        higherIsBetter: true,
      })
    }
    if (log.hr) {
      metrics.push({
        label: 'FC moyenne',
        value: `${log.hr} bpm`,
        delta: before?.hr ? -(delta(log.hr, before.hr) ?? 0) : null,
        higherIsBetter: true,
      })
    }
    if (log.elev) {
      metrics.push({ label: 'Dénivelé', value: `${log.elev} m`, delta: null, higherIsBetter: true })
    }
  }

  if (session.kind === 'swim') {
    if (log.continuous) {
      metrics.push({
        label: 'Distance continue',
        value: `${log.continuous} m`,
        delta: before?.continuous ? delta(log.continuous, before.continuous) : null,
        higherIsBetter: true,
      })
    }
    if (log.distance) {
      metrics.push({
        label: 'Distance totale',
        value: `${log.distance} m`,
        delta: before?.distance ? delta(log.distance, before.distance) : null,
        higherIsBetter: true,
      })
    }
    if (log.minutes) {
      metrics.push({
        label: 'Durée',
        value: `${log.minutes} min`,
        delta: null,
        higherIsBetter: true,
      })
    }
  }

  if (session.kind === 'strength') {
    const reps = log.reps ?? 0
    metrics.push({
      label: 'Répétitions',
      value: `${reps}`,
      delta: before ? delta(reps, before.reps ?? 0) : null,
      higherIsBetter: true,
    })
    if (log.sets) {
      metrics.push({
        label: 'Séries',
        value: `${log.sets}`,
        delta: before?.sets ? delta(log.sets, before.sets) : null,
        higherIsBetter: true,
      })
    }
  }

  const volumeLabel =
    session.kind === 'run'
      ? `${(log.km ?? 0).toFixed(2)} km en ${Math.round(log.minutes ?? 0)} min`
      : session.kind === 'swim'
        ? `${log.continuous ?? 0} m sans pause`
        : `${log.reps ?? 0} répétitions sur ${log.sets ?? 0} séries`

  return { metrics, previousDate: previous?.date ?? null, volumeLabel }
}

/** Total de répétitions réellement effectuées, séries de test comprises. */
export function totalReps(sets: { reps: number }[]): number {
  return sum(sets.map((s) => s.reps))
}
