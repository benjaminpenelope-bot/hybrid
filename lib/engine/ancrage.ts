import { addDays } from './date'
import { sum } from './math'
import { baseWeeklyKm, RUN_GROWTH } from './program'
import type { AthleteState, ISODate } from './types'

/**
 * RÉ-ANCRAGE DU VOLUME
 *
 * Le programme partait du volume déclaré au questionnaire, et n'en repartait
 * jamais. Un athlète qui annonçait dix-huit kilomètres en août voyait son plan
 * calculé sur dix-huit kilomètres en décembre, qu'il en coure trente ou huit.
 * Le produit dit pourtant partout qu'il part de ce que l'on fait, pas de ce
 * que l'on a dit : c'était vrai le premier jour seulement.
 *
 * À chaque prolongation, la base est donc recalculée sur ce qui a été
 * réellement couru — mesuré, jamais déclaré. La règle est celle de
 * l'inscription, `baseWeeklyKm` : jamais plus de dix pour cent au-dessus du
 * volume constaté.
 */

/** Fenêtre de mesure. Quatre semaines : la même que la charge chronique. */
const FENETRE_JOURS = 28

/**
 * En dessous, on ne mesure rien.
 *
 * Trois sorties en quatre semaines, c'est le minimum pour que la moyenne
 * décrive une habitude plutôt qu'un accident. En dessous, la base du
 * questionnaire reste en vigueur : une mesure douteuse vaut moins qu'une
 * déclaration assumée.
 */
const SORTIES_MIN = 3

/**
 * Volume de course hebdomadaire réellement couru, en kilomètres.
 * `null` quand l'historique est trop mince pour en dire quoi que ce soit.
 */
export function volumeHebdoReel(state: AthleteState, today: ISODate): number | null {
  const depuis = addDays(today, -FENETRE_JOURS)
  const sorties = state.sessions.filter(
    (s) => s.status === 'done' && s.date > depuis && s.date <= today && (s.log?.km ?? 0) > 0,
  )
  if (sorties.length < SORTIES_MIN) return null

  const km = sum(sorties.map((s) => s.log?.km ?? 0))
  return Math.round((km / (FENETRE_JOURS / 7)) * 10) / 10
}

/**
 * Base à passer au générateur pour qu'à la semaine `w`, le volume vaille
 * exactement `km`.
 *
 * La rampe compose huit pour cent par semaine depuis la semaine 1 : pour
 * ancrer une valeur au milieu du plan, il suffit de remonter le temps. Le
 * compteur de semaines reste ainsi continu — c'est lui qui porte le cycle de
 * décharge et la progression de la force, qu'un retour à la semaine 1
 * remettrait à zéro.
 */
export function baseAncreeSur(km: number, w: number): number {
  if (w <= 1) return km
  return Math.round((km / Math.pow(RUN_GROWTH, w - 1)) * 100) / 100
}

/**
 * Base du prochain bloc : mesurée si l'historique le permet, celle du profil
 * sinon. Le second membre du couple dit laquelle des deux a servi, ce qui
 * évite d'avoir à le redeviner à l'affichage.
 */
export function baseDuProchainBloc(
  state: AthleteState,
  today: ISODate,
  semaine: number,
  baseDuProfil: number | null,
): { baseKm: number | null; mesuree: boolean } {
  const reel = volumeHebdoReel(state, today)
  if (reel === null) return { baseKm: baseDuProfil, mesuree: false }
  return { baseKm: baseAncreeSur(baseWeeklyKm(reel), semaine), mesuree: true }
}
