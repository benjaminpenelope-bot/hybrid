import { addDays, mondayOf } from './date'
import { buildReview, type Review } from './review'
import { weekScore } from './advice'
import type { AthleteState, ISODate } from './types'

/**
 * HISTORIQUE DES BILANS
 *
 * Semaine après semaine, ce qui a été fait — et l'écart avec la semaine
 * d'avant.
 *
 * RIEN N'EST ARCHIVÉ. Un bilan n'est pas un document qu'on enregistre le
 * dimanche soir : c'est une lecture des séances, et les séances sont déjà en
 * base. Recalculer plutôt que stocker évite trois problèmes d'un coup — la
 * tâche planifiée qui peut ne pas tourner, la table qui se désynchronise
 * quand une séance est corrigée après coup, et la semaine manquante chez qui
 * n'a pas ouvert l'application ce dimanche-là.
 *
 * `buildReview` accepte n'importe quelle date : il suffit donc de l'appeler
 * au dimanche de chaque semaine passée. Un bilan corrigé aujourd'hui reflète
 * la correction, ce qu'une archive n'aurait pas fait.
 */

export interface BilanHebdo {
  /** Lundi de la semaine couverte. Identifiant naturel de la semaine. */
  semaine: ISODate
  du: ISODate
  au: ISODate
  /** Assiduité 60 % + volume atteint 40 %, la même formule que l'écran. */
  score: number
  review: Review
}

/**
 * Semaines closes, de la plus récente à la plus ancienne.
 *
 * Close veut dire terminée : la semaine en cours n'en fait pas partie, on ne
 * juge pas une semaine qu'on est en train de vivre. Le bilan du dimanche
 * n'apparaît donc que le lundi.
 */
export function semainesCloses(today: ISODate, combien: number): { semaine: ISODate; du: ISODate; au: ISODate }[] {
  const lundiCourant = mondayOf(today)
  const out: { semaine: ISODate; du: ISODate; au: ISODate }[] = []
  for (let i = 1; i <= combien; i++) {
    const du = addDays(lundiCourant, -7 * i)
    out.push({ semaine: du, du, au: addDays(du, 6) })
  }
  return out
}

/**
 * Les `combien` derniers bilans hebdomadaires, du plus récent au plus ancien.
 *
 * On s'arrête à la première séance enregistrée : au-delà, l'athlète n'avait
 * pas de programme, et une enfilade de semaines à zéro se lirait comme un
 * abandon plutôt que comme une absence de compte.
 */
export function historiqueDesBilans(
  state: AthleteState,
  today: ISODate,
  combien = 12,
): BilanHebdo[] {
  const premiere = state.sessions
    .filter((s) => s.status === 'done')
    .map((s) => s.date)
    .sort()[0]
  if (premiere === undefined) return []

  return semainesCloses(today, combien)
    // La semaine doit avoir commencé après — ou couvrir — la première séance.
    .filter((s) => s.au >= premiere)
    .map((s) => ({
      ...s,
      score: weekScore(state, s.au),
      review: buildReview(state, s.au, 7),
    }))
}

/**
 * Le fil des scores, du plus ancien au plus récent, pour une courbe.
 * L'ordre est inversé par rapport à la liste : on lit un historique du plus
 * récent, on trace une courbe du plus ancien.
 */
export function courbeDesScores(bilans: BilanHebdo[]): { date: ISODate; valeur: number }[] {
  return [...bilans].reverse().map((b) => ({ date: b.semaine, valeur: b.score }))
}
