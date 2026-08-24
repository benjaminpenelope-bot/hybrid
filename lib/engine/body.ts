import { daysBetween, mondayOf } from './date'
import { sum } from './math'
import type { AthleteState, ISODate, Profile } from './types'

/**
 * SUIVI DU POIDS
 *
 * Extrait de l'écran Corps pour servir aussi l'accueil sur grand écran.
 * Une seule pesée ne dit rien d'une tendance : la vitesse de prise reste
 * `null` tant que deux pesées ne sont pas espacées d'au moins une semaine.
 */

/** Au-delà, la prise se fait surtout en gras plutôt qu'en muscle. */
export const GAIN_MAX_KG_SEMAINE = 0.25

/** Fenêtre sur laquelle la vitesse de prise est calculée. */
const FENETRE_JOURS = 28

/** Nombre de jours minimum entre deux pesées pour qu'un écart soit une tendance. */
const ECART_MIN_JOURS = 7

export interface WeightTrend {
  /** Moyenne par semaine calendaire, pour lisser le bruit quotidien. */
  weekly: { date: ISODate; kg: number }[]
  /** kg par semaine, ou null si l'historique ne permet pas de le dire. */
  rate: number | null
  /** Dernière pesée connue, ou le poids de départ du profil à défaut. */
  current: number
  /** Écart déjà parcouru vers l'objectif. */
  gain: number
  /** Écart total à parcourir entre le départ et l'objectif. */
  target: number
  tooFast: boolean
}

export function weightTrend(state: AthleteState, today: ISODate): WeightTrend {
  const profile: Profile = state.profile
  const weights = [...state.weights].sort((a, b) => a.date.localeCompare(b.date))

  const recent = weights.filter((w) => daysBetween(w.date, today) <= FENETRE_JOURS)
  const first = recent[0]
  const last = recent[recent.length - 1]
  const span = first && last ? daysBetween(first.date, last.date) : 0
  const rate = first && last && span >= ECART_MIN_JOURS ? (last.kg - first.kg) / (span / 7) : null

  const buckets = new Map<string, number[]>()
  for (const w of weights) {
    const key = mondayOf(w.date)
    buckets.set(key, [...(buckets.get(key) ?? []), w.kg])
  }
  const weekly = [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({ date, kg: sum(values) / values.length }))

  const current = weights[weights.length - 1]?.kg ?? profile.startWeight

  return {
    weekly,
    rate,
    current,
    gain: current - profile.startWeight,
    target: profile.goalWeight - profile.startWeight,
    // Le sens compte : sur une perte, c'est descendre trop vite qui alerte.
    tooFast:
      rate !== null && Math.abs(rate) > GAIN_MAX_KG_SEMAINE && Math.sign(rate) === Math.sign(profile.goalWeight - profile.startWeight),
  }
}
