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

/**
 * VITESSE DE PERTE
 *
 * Une perte se juge en pourcentage du poids de corps, pas en kilos : perdre
 * six cents grammes par semaine n'a pas le même sens à cinquante kilos qu'à
 * cent. Trois quarts de pour cent est le seuil au-delà duquel la perte se
 * fait de plus en plus aux dépens du muscle.
 *
 * La règle de la prise ne pouvait pas servir ici. Elle plafonne à 250 g par
 * semaine, ce qui est une prise rapide — et une perte lente. Appliquée telle
 * quelle, elle aurait signalé comme dangereuse une perte parfaitement saine,
 * et l'alerte serait devenue du bruit.
 */
export const PERTE_MAX_PART_SEMAINE = 0.0075

/**
 * Vitesse hebdomadaire au-delà de laquelle on prévient, en kilos.
 *
 * Le sens compte : on ne borne que la direction visée. Reprendre un kilo
 * pendant une perte n'est pas une perte trop rapide, c'est autre chose — et
 * le confondre avec ça donnerait un mauvais conseil.
 */
export function vitesseMaximale(poidsActuel: number, perte: boolean): number {
  return perte ? poidsActuel * PERTE_MAX_PART_SEMAINE : GAIN_MAX_KG_SEMAINE
}

/** Fenêtre sur laquelle la vitesse de prise est calculée. */
const FENETRE_JOURS = 28

/** Nombre de jours minimum entre deux pesées pour qu'un écart soit une tendance. */
const ECART_MIN_JOURS = 7

export interface WeightTrend {
  /** `true` quand le poids cible est sous le poids de départ. */
  perte: boolean
  /** Vitesse au-delà de laquelle on prévient, en kg par semaine. */
  vitesseMax: number
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

  const ecart = profile.goalWeight - profile.startWeight
  const perte = ecart < 0
  const vitesseMax = vitesseMaximale(current, perte)

  return {
    weekly,
    rate,
    current,
    perte,
    vitesseMax: Math.round(vitesseMax * 100) / 100,
    gain: current - profile.startWeight,
    target: ecart,
    /*
     * Le sens compte : on ne borne que la direction visee. Descendre vite
     * quand on cherche a descendre est ce qu'on signale ; remonter pendant
     * une perte est un autre probleme, et le confondre avec celui-ci donnerait
     * un mauvais conseil.
     *
     * Le seuil, lui, n'est plus le meme dans les deux sens : une perte se
     * juge en part du poids de corps, une prise en kilos absolus. Voir
     * `vitesseMaximale`.
     */
    tooFast: rate !== null && Math.abs(rate) > vitesseMax && Math.sign(rate) === Math.sign(ecart),
  }
}
