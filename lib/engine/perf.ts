import { addDays, daysBetween } from './date'
import { pace, sum } from './math'
import { swimLadder } from './program'
import { benchmarkValue, isPartial } from './state'
import type { AthleteState, BenchmarkKey, ISODate, Session } from './types'

/**
 * STATISTIQUES DE PERFORMANCE
 * Tout se déduit des séances enregistrées. Une statistique sans donnée vaut
 * `null` et s'affiche « à mesurer » — jamais 0, qui se lirait comme un résultat.
 */

const doneRuns = (state: AthleteState, until: ISODate): Session[] =>
  state.sessions.filter(
    (s) => s.status === 'done' && s.kind === 'run' && s.log?.km && s.date <= until,
  )

export interface RunStats {
  km7: number
  km30: number
  longest: number | null
  /** Meilleure allure en min/km, sur les sorties d'au moins 3 km. */
  bestPace: number | null
  /** Meilleur temps sur 5 km, en minutes, extrapolé d'aucune façon. */
  best5k: number | null
  best10k: number | null
  avgHr: number | null
  /** Une entrée par sortie, pour le graphique. */
  points: { date: ISODate; km: number; pace: number }[]
}

export function runStats(state: AthleteState, today: ISODate): RunStats {
  const runs = doneRuns(state, today)
  const km = (s: Session) => s.log?.km ?? 0
  const min = (s: Session) => s.log?.minutes ?? 0

  const last7 = runs.filter((s) => s.date > addDays(today, -8))
  const last30 = runs.filter((s) => s.date > addDays(today, -31))
  const paced = runs.filter((s) => km(s) >= 3 && min(s) > 0)
  const withHr = runs.filter((s) => s.log?.hr)

  /** Temps réel sur une distance : seules les sorties qui l'atteignent comptent. */
  const bestOver = (distance: number): number | null => {
    const eligible = runs.filter((s) => km(s) >= distance && min(s) > 0)
    if (eligible.length === 0) return null
    return Math.min(...eligible.map((s) => (min(s) / km(s)) * distance))
  }

  return {
    km7: sum(last7.map(km)),
    km30: sum(last30.map(km)),
    longest: runs.length > 0 ? Math.max(...runs.map(km)) : null,
    bestPace: paced.length > 0 ? Math.min(...paced.map((s) => min(s) / km(s))) : null,
    best5k: bestOver(5),
    best10k: bestOver(10),
    avgHr:
      withHr.length > 0
        ? Math.round(sum(withHr.map((s) => s.log?.hr ?? 0)) / withHr.length)
        : null,
    points: runs
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((s) => ({ date: s.date, km: km(s), pace: min(s) / km(s) })),
  }
}

export interface SwimStats {
  /** Meilleure distance nagée sans pause, en mètres. */
  continuous: number | null
  totalDistance: number
  sessions: number
  /** Allure moyenne sur 100 m, en minutes. */
  pacePer100: number | null
  crawl: boolean
  /** Échelle 25 → 1 500 m avec le palier atteint. */
  ladder: { distance: number; reached: boolean; current: boolean }[]
}

export function swimStats(state: AthleteState, today: ISODate): SwimStats {
  const swims = state.sessions.filter(
    (s) => s.status === 'done' && s.kind === 'swim' && s.date <= today,
  )
  const declared = benchmarkValue(state.benchmarks.swim_continuous)
  const logged = swims.map((s) => s.log?.continuous ?? 0)
  const best = Math.max(declared ?? 0, ...(logged.length > 0 ? logged : [0]))

  const measured = swims.filter((s) => s.log?.distance && s.log?.minutes)
  const totalDistance = sum(swims.map((s) => s.log?.distance ?? 0))
  const totalMinutes = sum(measured.map((s) => s.log?.minutes ?? 0))
  const measuredDistance = sum(measured.map((s) => s.log?.distance ?? 0))

  const rungs = [25, 50, 75, 100, 150, 200, 300, 400, 600, 800, 1000, 1200, 1500]
  const reachedIndex = rungs.reduce((acc, d, i) => (best >= d ? i : acc), -1)

  return {
    continuous: best > 0 ? best : null,
    totalDistance,
    sessions: swims.length,
    pacePer100:
      measuredDistance > 0 ? (totalMinutes / measuredDistance) * 100 : null,
    crawl: swims.some((s) => s.log?.crawl === true),
    ladder: rungs.map((distance, i) => ({
      distance,
      reached: i <= reachedIndex,
      current: i === reachedIndex,
    })),
  }
}

export interface StreetCard {
  key: BenchmarkKey
  label: string
  value: number | null
  target: number
  /** true quand seul un plancher est connu. */
  partial: boolean
  testedAt: ISODate | null
}

const STREET_TARGETS: { key: BenchmarkKey; label: string; target: number }[] = [
  { key: 'pullups', label: 'Tractions', target: 20 },
  { key: 'dips', label: 'Dips', target: 30 },
  { key: 'muscleups', label: 'Muscle-ups', target: 8 },
  { key: 'legraises', label: 'Relevés de jambes', target: 20 },
  { key: 'squats', label: 'Squats', target: 80 },
]

export interface StreetStats {
  cards: StreetCard[]
  /** Répétitions à la barre sur 14 jours. */
  barVolume14d: number
  /** Jours depuis le dernier test, null si jamais testé. */
  daysSinceTest: number | null
}

export function streetStats(state: AthleteState, today: ISODate): StreetStats {
  const cards: StreetCard[] = STREET_TARGETS.map(({ key, label, target }) => {
    const b = state.benchmarks[key]
    return {
      key,
      label,
      value: benchmarkValue(b),
      target,
      partial: isPartial(b),
      testedAt: b?.testedAt ?? null,
    }
  })

  const from14 = addDays(today, -15)
  const barVolume14d = sum(
    state.sessions
      .filter(
        (s) => s.status === 'done' && s.type === 'UPPER' && s.date > from14 && s.date <= today,
      )
      .map((s) => s.log?.reps ?? 0),
  )

  const dates = cards.map((c) => c.testedAt).filter((d): d is ISODate => d !== null)
  const latest = dates.sort()[dates.length - 1]

  return {
    cards,
    barVolume14d,
    daysSinceTest: latest ? daysBetween(latest, today) : null,
  }
}

/** Allure formatée, ou « à mesurer » quand la donnée manque. */
export function paceLabel(minutes: number | null): string {
  return minutes === null ? 'à mesurer' : `${pace(minutes, 1)}/km`
}

/** Durée en minutes formatée en h:mm:ss lisible. */
export function timeLabel(minutes: number | null): string {
  if (minutes === null) return 'à mesurer'
  const total = Math.round(minutes * 60)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`
}

export const SWIM_LADDER = swimLadder
