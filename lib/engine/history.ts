import { addDays, mondayOf } from './date'
import { sessionLoad } from './load'
import { sum } from './math'
import type { AthleteState, ISODate } from './types'

/**
 * HISTORIQUE HEBDOMADAIRE
 * Agrégats par semaine calendaire, pour les graphiques longs des grands écrans.
 * Une semaine sans séance vaut 0 — c'est une mesure, pas une absence de mesure :
 * on sait qu'il ne s'est rien passé.
 */

export interface WeekPoint {
  /** Lundi de la semaine. */
  week: ISODate
  label: string
  km: number
  swimM: number
  reps: number
  load: number
  done: number
  planned: number
}

export function weeklySeries(state: AthleteState, today: ISODate, weeks = 12): WeekPoint[] {
  const currentMonday = mondayOf(today)
  const points: WeekPoint[] = []

  // Avant la première séance connue, l'app n'observait rien. Tracer 0 y ferait
  // croire à des semaines sans entraînement alors qu'on n'en sait rien.
  const debut = state.sessions.reduce<ISODate | null>(
    (min, s) => (min === null || s.date < min ? s.date : min),
    null,
  )
  const premiereSemaine = debut === null ? currentMonday : mondayOf(debut)

  for (let i = weeks - 1; i >= 0; i--) {
    const week = addDays(currentMonday, -i * 7)
    if (week < premiereSemaine) continue
    const end = addDays(week, 6)
    const inWeek = state.sessions.filter((s) => s.date >= week && s.date <= end)
    const done = inWeek.filter((s) => s.status === 'done')

    points.push({
      week,
      label: `${Number(week.slice(8, 10))}/${Number(week.slice(5, 7))}`,
      km: Math.round(sum(done.map((s) => s.log?.km ?? 0)) * 10) / 10,
      swimM: sum(done.map((s) => s.log?.distance ?? 0)),
      reps: sum(done.map((s) => s.log?.reps ?? 0)),
      load: Math.round(
        sum(done.map((s) => sessionLoad(s.log?.minutes ?? s.duration ?? 0, s.rpe ?? s.rpeEst ?? 0))),
      ),
      done: done.length,
      planned: inWeek.filter((s) => s.type !== 'REST').length,
    })
  }

  return points
}

/** Répartition du temps par discipline sur une période, en minutes réellement enregistrées. */
export function disciplineSplit(
  state: AthleteState,
  today: ISODate,
  days = 28,
): { kind: string; label: string; minutes: number; color: string }[] {
  const from = addDays(today, -days)
  const done = state.sessions.filter(
    (s) => s.status === 'done' && s.date > from && s.date <= today,
  )

  const meta = [
    { kind: 'run', label: 'Course', color: 'var(--run)' },
    { kind: 'swim', label: 'Natation', color: 'var(--swim)' },
    { kind: 'strength', label: 'Force', color: 'var(--street)' },
  ]

  return meta.map((m) => ({
    ...m,
    minutes: Math.round(
      sum(done.filter((s) => s.kind === m.kind).map((s) => s.log?.minutes ?? s.duration ?? 0)),
    ),
  }))
}
