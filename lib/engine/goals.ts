import { addDays } from './date'
import { clamp, sum } from './math'
import { runStats, streetStats, swimStats } from './perf'
import { currentWeight } from './state'
import type { AthleteState, ISODate } from './types'

/**
 * OBJECTIFS
 * Chaque objectif est mesurable et sa progression se calcule sur les données
 * réelles. Un objectif dont la donnée manque affiche sa progression à `null`
 * plutôt qu'à zéro : on ne sait pas, ce n'est pas la même chose que rien.
 */

export type Horizon = '12 mois' | '6 mois' | '3 mois' | 'Cette semaine'

export interface Goal {
  horizon: Horizon
  label: string
  /** Où on en est, en clair. */
  current: string
  target: string
  /** 0 à 100, ou null quand la donnée n'est pas mesurée. */
  progress: number | null
}

export function computeGoals(state: AthleteState, today: ISODate): Goal[] {
  const run = runStats(state, today)
  const swim = swimStats(state, today)
  const street = streetStats(state, today)
  const weight = currentWeight(state)
  const goalWeight = state.profile.goalWeight
  const startWeight = state.profile.startWeight

  const card = (key: string) => street.cards.find((c) => c.key === key)
  const pullups = card('pullups')?.value ?? null
  const muscleups = card('muscleups')?.value ?? null

  // Les sept derniers jours, aujourd'hui inclus.
  const weekSessions = state.sessions.filter(
    (s) => s.date >= addDays(today, -6) && s.date <= today,
  )
  const weekDone = weekSessions.filter((s) => s.status === 'done').length
  const weekPlanned = weekSessions.filter((s) => s.type !== 'REST').length
  const weekKm = sum(
    weekSessions.filter((s) => s.status === 'done').map((s) => s.log?.km ?? 0),
  )

  const goals: Goal[] = [
    {
      horizon: '12 mois',
      label: 'Marathon sous 4 h',
      current: run.longest === null ? 'aucune sortie mesurée' : `${run.longest.toFixed(1)} km`,
      target: '42,2 km',
      progress: run.longest === null ? null : clamp((run.longest / 42.2) * 100),
    },
    {
      horizon: '12 mois',
      label: '1 500 m nagés sans pause',
      current: swim.continuous === null ? 'à mesurer' : `${swim.continuous} m`,
      target: '1 500 m',
      // L'échelle est logarithmique : passer de 25 à 50 m vaut autant d'efforts
      // que de 750 à 1 500 m.
      progress:
        swim.continuous === null || swim.continuous <= 0
          ? null
          : clamp((Math.log(swim.continuous / 25) / Math.log(1500 / 25)) * 100),
    },
    {
      horizon: '12 mois',
      label: `${goalWeight} kg`,
      current: `${weight.toFixed(1)} kg`,
      target: `${goalWeight} kg`,
      progress:
        goalWeight === startWeight
          ? null
          : clamp(((weight - startWeight) / (goalWeight - startWeight)) * 100),
    },
    {
      horizon: '6 mois',
      label: 'Sortie longue de 25 km',
      current: run.longest === null ? 'aucune sortie mesurée' : `${run.longest.toFixed(1)} km`,
      target: '25 km',
      progress: run.longest === null ? null : clamp((run.longest / 25) * 100),
    },
    {
      horizon: '6 mois',
      label: '15 tractions strictes',
      current: pullups === null ? 'À TESTER' : `${pullups}`,
      target: '15',
      progress: pullups === null ? null : clamp((pullups / 15) * 100),
    },
    {
      horizon: '3 mois',
      label: '30 km de course par semaine',
      current: `${run.km7.toFixed(1)} km`,
      target: '30 km',
      progress: clamp((run.km7 / 30) * 100),
    },
    {
      horizon: '3 mois',
      label: '400 m nagés sans pause',
      current: swim.continuous === null ? 'à mesurer' : `${swim.continuous} m`,
      target: '400 m',
      progress:
        swim.continuous === null ? null : clamp((swim.continuous / 400) * 100),
    },
    {
      horizon: '3 mois',
      label: '5 muscle-ups consécutifs',
      current: muscleups === null ? 'À TESTER' : `${muscleups}`,
      target: '5',
      progress: muscleups === null ? null : clamp((muscleups / 5) * 100),
    },
    {
      horizon: 'Cette semaine',
      label: 'Séances réalisées',
      current: `${weekDone}`,
      target: `${weekPlanned}`,
      progress: weekPlanned > 0 ? clamp((weekDone / weekPlanned) * 100) : null,
    },
    {
      horizon: 'Cette semaine',
      label: 'Kilomètres courus',
      current: `${weekKm.toFixed(1)} km`,
      target: `${(state.profile.baseWeeklyKm ?? 15).toFixed(1)} km`,
      progress: clamp((weekKm / (state.profile.baseWeeklyKm ?? 15)) * 100),
    },
  ]

  return goals
}

export const HORIZONS: Horizon[] = ['Cette semaine', '3 mois', '6 mois', '12 mois']
