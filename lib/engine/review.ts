import { addDays } from './date'
import { sessionLoad, UNITE_CHARGE } from './load'
import { sum } from './math'
import type { AthleteState, ISODate, RecordEntry, Session } from './types'

/**
 * BILANS
 * Comparaison d'une période à la précédente, sur des données enregistrées.
 * Une période sans données ne se compare pas : le delta vaut `null`.
 */

export interface Delta {
  label: string
  value: string
  /** Écart en % avec la période précédente, null s'il n'y a rien à comparer. */
  delta: number | null
}

export interface Review {
  from: ISODate
  to: ISODate
  done: number
  planned: number
  metrics: Delta[]
  records: RecordEntry[]
  /** Ce qui progresse, ce qui doit progresser. */
  progressing: string[]
  lagging: string[]
}

const between = (sessions: Session[], from: ISODate, to: ISODate): Session[] =>
  sessions.filter((s) => s.date > from && s.date <= to)

const delta = (now: number, before: number): number | null =>
  before > 0 ? Math.round(((now - before) / before) * 100) : null

function totals(sessions: Session[]) {
  const done = sessions.filter((s) => s.status === 'done')
  return {
    done: done.length,
    km: sum(done.map((s) => s.log?.km ?? 0)),
    swimM: sum(done.map((s) => s.log?.distance ?? 0)),
    reps: sum(done.map((s) => s.log?.reps ?? 0)),
    load: Math.round(
      sum(done.map((s) => sessionLoad(s.log?.minutes ?? s.duration ?? 0, s.rpe ?? s.rpeEst ?? 0))),
    ),
  }
}

function weightAverage(state: AthleteState, from: ISODate, to: ISODate): number | null {
  const values = state.weights.filter((w) => w.date > from && w.date <= to).map((w) => w.kg)
  return values.length > 0 ? sum(values) / values.length : null
}

/** Bilan sur `days` jours, comparé aux `days` jours précédents. */
export function buildReview(state: AthleteState, today: ISODate, days: number): Review {
  const from = addDays(today, -days)
  const previousFrom = addDays(today, -days * 2)

  const current = between(state.sessions, from, today)
  const previous = between(state.sessions, previousFrom, from)

  const now = totals(current)
  const before = totals(previous)
  const weightNow = weightAverage(state, from, today)
  const weightBefore = weightAverage(state, previousFrom, from)

  const metrics: Delta[] = [
    { label: 'Course', value: `${now.km.toFixed(1)} km`, delta: delta(now.km, before.km) },
    {
      label: 'Natation',
      value: now.swimM > 0 ? `${now.swimM} m` : 'non mesurée',
      delta: delta(now.swimM, before.swimM),
    },
    {
      label: 'Volume à la barre',
      value: now.reps > 0 ? `${now.reps} répétitions` : 'non mesuré',
      delta: delta(now.reps, before.reps),
    },
    { label: 'Charge', value: `${now.load} ${UNITE_CHARGE}`, delta: delta(now.load, before.load) },
    {
      label: 'Poids moyen',
      value: weightNow === null ? 'aucune pesée' : `${weightNow.toFixed(1)} kg`,
      delta: weightNow !== null && weightBefore !== null ? delta(weightNow, weightBefore) : null,
    },
  ]

  const progressing = metrics
    .filter((m) => m.delta !== null && m.delta > 5 && m.label !== 'Charge')
    .map((m) => m.label)
  const lagging = metrics
    .filter((m) => m.delta !== null && m.delta < -5 && m.label !== 'Charge')
    .map((m) => m.label)

  return {
    from,
    to: today,
    done: now.done,
    planned: current.filter((s) => s.type !== 'REST').length,
    metrics,
    records: state.records.filter((r) => r.date > from && r.date <= today),
    progressing,
    lagging,
  }
}
