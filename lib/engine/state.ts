import { addDays } from './date'
import type {
  AthleteState,
  Benchmark,
  BenchmarkKey,
  ISODate,
  Session,
  Wellness,
} from './types'

/**
 * Lectures dérivées de l'etat. Une seule source de vérité : rien n'est
 * stocké en double, tout se recalcule à partir des séances enregistrées.
 */

/** Valeur d'un repère de force. null quand il n'a jamais été testé. */
export function benchmarkValue(b: Benchmark | null | undefined): number | null {
  return b && typeof b.value === 'number' ? b.value : null
}

export function isPartial(b: Benchmark | null | undefined): boolean {
  return !!b?.partial
}

export const UNTESTED = 'A TESTER'

/** Repère formaté pour l'affichage : jamais de valeur inventée. */
export function benchmarkLabel(b: Benchmark | null | undefined, target: number): string {
  const v = benchmarkValue(b)
  if (v === null) return UNTESTED
  return `${v}${isPartial(b) ? '+' : ''} / ${target}`
}

export function doneSessions(state: AthleteState, until?: ISODate): Session[] {
  return state.sessions.filter((x) => x.status === 'done' && (!until || x.date <= until))
}

/** Séances réalisées dans les `days` derniers jours, aujourd'hui inclus. */
export function sessionsSince(state: AthleteState, today: ISODate, days: number): Session[] {
  const from = addDays(today, -days)
  return state.sessions.filter((x) => x.status === 'done' && x.date > from && x.date <= today)
}

/** Meilleure distance nagee sans pause et acquisition du crawl, déduites des séances. */
export function swimBest(state: AthleteState): { continuous: number; crawl: boolean } {
  const swims = state.sessions.filter((x) => x.status === 'done' && x.kind === 'swim')
  // La distance déclarée à l'onboarding compte tant qu'aucune séance ne l'a
  // dépassée : c'est une donnée fournie par l'athlète, pas une invention.
  const declared = benchmarkValue(state.benchmarks.swim_continuous) ?? 0
  const continuous = swims.reduce((max, x) => Math.max(max, x.log?.continuous ?? 0), declared)
  const crawl = swims.some((x) => x.log?.crawl === true)
  return { continuous, crawl }
}

export function currentWeight(state: AthleteState): number {
  const sorted = [...state.weights].sort((a, b) => a.date.localeCompare(b.date))
  return sorted[sorted.length - 1]?.kg ?? state.profile.startWeight
}

/** Dernier relevé de bien-être disponible à la date donnée. */
export function lastWellness(state: AthleteState, today: ISODate): Wellness | null {
  const past = state.wellness
    .filter((x) => x.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date))
  return past[past.length - 1] ?? null
}

export function wellnessOn(state: AthleteState, date: ISODate): Wellness | null {
  return state.wellness.find((x) => x.date === date) ?? null
}

export const BENCHMARK_KEYS: BenchmarkKey[] = [
  'pullups',
  'dips',
  'muscleups',
  'legraises',
  'squats',
]

export const BENCHMARK_LABELS: Record<BenchmarkKey, string> = {
  pullups: 'Tractions',
  dips: 'Dips',
  muscleups: 'Muscle-ups',
  legraises: 'Relevés de jambes',
  squats: 'Squats',
  pushups: 'Pompes',
  swim_continuous: 'Distance nagée sans pause',
}
