import { addDays, dayLabel } from './date'
import type { AthleteState, ISODate } from './types'

/**
 * PAS
 *
 * Dix mille par jour : un repère, pas une prescription. Il ne vient d'aucune
 * étude — l'origine est une campagne publicitaire japonaise des années
 * soixante — mais tout le monde le connaît, et un repère partagé vaut mieux
 * qu'un seuil personnalisé que personne ne sait interpréter.
 *
 * Les pas ne comptent dans aucun score et n'entrent dans aucune charge :
 * marcher n'est pas s'entraîner, et les mélanger fausserait le ratio
 * aigu/chronique. Ils disent autre chose — combien on bouge les jours où l'on
 * ne s'entraîne pas — et c'est déjà beaucoup.
 *
 * Une journée sans mesure reste sans mesure. Zéro voudrait dire « pas un
 * pas », ce qui n'arrive à personne.
 */

export const OBJECTIF_PAS = 10000

export interface JourDePas {
  date: ISODate
  jour: string
  /** `null` = non mesuré. Jamais zéro par défaut. */
  pas: number | null
}

export interface BilanPas {
  /** Les `jours` derniers jours, du plus ancien au plus récent. */
  serie: JourDePas[]
  /** Pas d'aujourd'hui, ou `null` si rien n'a été mesuré. */
  aujourdhui: number | null
  /** Moyenne sur les jours mesurés, `null` s'il n'y en a aucun. */
  moyenne: number | null
  /** Jours où l'objectif est atteint, sur les jours mesurés. */
  atteints: number
  mesures: number
}

export function bilanDesPas(state: AthleteState, today: ISODate, jours = 7): BilanPas {
  const parDate = new Map<string, number | null>()
  for (const w of state.wellness) {
    if (w.steps !== undefined && w.steps !== null) parDate.set(w.date, w.steps)
  }

  const serie: JourDePas[] = []
  for (let i = jours - 1; i >= 0; i--) {
    const date = addDays(today, -i)
    serie.push({ date, jour: dayLabel(date), pas: parDate.get(date) ?? null })
  }

  const mesures = serie.filter((j) => j.pas !== null)
  const total = mesures.reduce((a, j) => a + (j.pas ?? 0), 0)

  return {
    serie,
    aujourdhui: parDate.get(today) ?? null,
    moyenne: mesures.length > 0 ? Math.round(total / mesures.length) : null,
    atteints: mesures.filter((j) => (j.pas ?? 0) >= OBJECTIF_PAS).length,
    mesures: mesures.length,
  }
}

/** Part de l'objectif atteinte, bornée à 1. Utile au tracé d'un anneau. */
export function partDeLObjectif(pas: number | null): number {
  if (pas === null || pas <= 0) return 0
  return Math.min(1, pas / OBJECTIF_PAS)
}
