import { addDays, daysBetween } from './date'
import type { ISODate } from './types'

/**
 * HORIZON DU PROGRAMME
 *
 * Le plan était généré une seule fois, à l'inscription, sur huit semaines.
 * Rien ne le prolongeait : au bout de deux mois, l'athlète ouvrait
 * l'application et n'y trouvait plus rien. Pas un message, pas une erreur —
 * du vide. C'est le seul défaut du produit qui portait une date.
 *
 * Le programme se prolonge désormais de lui-même, en gardant toujours
 * quelques semaines d'avance. Ce fichier ne décide que du *quand* et du
 * *combien* : il ne connaît ni la base de données ni le générateur, ce qui
 * permet de l'éprouver sur des dates seules.
 */

/**
 * En dessous de cet horizon, on prolonge.
 *
 * Trois semaines : de quoi voir la sortie longue du week-end suivant et celle
 * d'après. Descendre à une semaine ferait apparaître les séances au
 * compte-gouttes, sous le nez de l'athlète ; monter à deux mois ferait
 * générer très loin un plan que la moindre blessure rendrait caduc.
 */
export const HORIZON_MIN_JOURS = 21

/** Ce qu'on ajoute quand on prolonge. */
export const BLOC_SEMAINES = 8

export interface Prolongation {
  /** Premier jour à générer. */
  depuis: ISODate
  /** Numéro de semaine de ce premier jour, dans la continuité du plan. */
  semaine: number
  /** Nombre de semaines à générer. */
  semaines: number
}

/**
 * Ce qu'il faut générer, ou `null` s'il n'y a rien à faire.
 *
 * `finDuPlan` est la date de la dernière séance existante, quel qu'en soit le
 * statut : une séance passée fait partie du plan autant qu'une séance à venir,
 * et c'est sa date qui dit jusqu'où le calendrier est peuplé.
 */
export function prolongationRequise(
  today: ISODate,
  finDuPlan: ISODate | null,
  semaineDeFin: number,
): Prolongation | null {
  /*
   * Aucun plan du tout : on repart d'aujourd'hui, semaine 1. Le cas se
   * présente pour un compte anterieur au questionnaire, ou dont les seances
   * ont ete supprimees.
   */
  if (finDuPlan === null) {
    return { depuis: today, semaine: 1, semaines: BLOC_SEMAINES }
  }

  /*
   * Un plan qui s'arrête dans le passé : le trou se compte depuis
   * aujourd'hui, pas depuis la dernière séance. Regénérer les semaines
   * manquantes rétroactivement ne servirait à personne — on ne s'entraîne pas
   * la semaine dernière.
   */
  const reste = daysBetween(today, finDuPlan)
  if (reste < 0) {
    return { depuis: today, semaine: semaineDeFin + 1, semaines: BLOC_SEMAINES }
  }

  if (reste >= HORIZON_MIN_JOURS) return null

  /*
   * La numérotation reprend là où le plan s'arrête. Elle porte la progression
   * du volume et le cycle de décharge : la remettre à un reviendrait à faire
   * redescendre l'athlète au volume de sa première semaine tous les deux
   * mois.
   */
  return {
    depuis: addDays(finDuPlan, 1),
    semaine: semaineDeFin + 1,
    semaines: BLOC_SEMAINES,
  }
}
