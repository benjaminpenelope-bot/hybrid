import { addDays, dayLabel, daysBetween } from './date'
import { clamp, sum } from './math'
import type { AthleteState, ISODate } from './types'

/**
 * CHARGE D'ENTRAINEMENT
 *
 * sRPE = durée x RPE. Une séance sans RPE saisi utilise l'estimation `rpeEst`,
 * et le point est alors marque comme estimé : on ne fait jamais passer une
 * estimation pour une mesure.
 *
 * L'unité s'écrit « min × effort » partout où le chiffre s'affiche, et jamais
 * « unités » ni « sRPE ». Le premier ne veut rien dire, le second est du
 * vocabulaire de laboratoire — or ce nombre se lit tout seul dès qu'on sait
 * d'où il vient : une heure difficile pèse plus qu'une heure facile, et c'est
 * exactement ce que la multiplication dit.
 */

/** Nom de l'unité, tel qu'il s'affiche. Un seul endroit pour en changer. */
export const UNITE_CHARGE = 'min × effort'

export interface LoadPoint {
  date: ISODate
  day: string
  load: number
  /** true = la charge du jour repose uniquement sur des RPE estimes. */
  est: boolean
}

export function sessionLoad(minutes: number, rpe: number): number {
  return minutes * rpe
}

export function loadSeries(state: AthleteState, days: number, today: ISODate): LoadPoint[] {
  const out: LoadPoint[] = []
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i)
    const day = state.sessions.filter((x) => x.date === date && x.status === 'done')
    const load = sum(
      day.map((x) => sessionLoad(x.log?.minutes ?? x.duration ?? 0, x.rpe ?? x.rpeEst ?? 0)),
    )
    out.push({
      date,
      day: dayLabel(date),
      load: Math.round(load),
      est: day.length > 0 && day.every((x) => !x.rpe),
    })
  }
  return out
}

export interface AcuteChronic {
  /** Charge des 7 derniers jours. */
  l7: number
  /** Charge hebdomadaire de référence, ramenée à l'historique disponible. */
  l28: number
  /** Ratio aigu / chronique. */
  acwr: number
  /** Nombre de jours d'historique réellement utilises, entre 7 et 28. */
  span: number
  /** false tant que l'historique ne permet pas un ratio significatif. */
  reliable: boolean
}

/**
 * Ratio aigu / chronique normalisé sur l'historique réellement disponible.
 * Sans cette normalisation, une première semaine de données produirait un
 * faux rouge : 7 jours de charge compares à une moyenne calculee sur 28.
 */
export function acuteChronic(state: AthleteState, today: ISODate): AcuteChronic {
  const l7 = sum(loadSeries(state, 7, today).map((x) => x.load))
  const first = state.sessions
    .filter((x) => x.status === 'done' && x.date <= today)
    .map((x) => x.date)
    .sort()[0]
  const span = clamp(first ? daysBetween(first, today) + 1 : 7, 7, 28)
  const l28 = (sum(loadSeries(state, 28, today).map((x) => x.load)) / span) * 7
  const acwr = l28 > 0 ? l7 / l28 : 1
  return { l7, l28, acwr, span, reliable: span >= 14 && l28 > 0 }
}

/** Nombre de jours consécutifs avec au moins une séance réalisée, avant aujourd'hui. */
export function consecutiveDays(state: AthleteState, today: ISODate, max = 14): number {
  let streak = 0
  for (let i = 1; i <= max; i++) {
    const date = addDays(today, -i)
    if (state.sessions.some((x) => x.date === date && x.status === 'done')) streak++
    else break
  }
  return streak
}

/** Repères d'interpretation de la charge hebdomadaire. */
export const LOAD_BANDS = [
  { label: 'Faible', range: '< 900', max: 900 },
  { label: 'Modérée', range: '900 – 1 800', max: 1800 },
  { label: 'Élevée', range: '> 1 800', max: Infinity },
] as const
