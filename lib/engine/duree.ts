import type { Session } from './types'

/**
 * DURÉE D'UNE SÉANCE : CELLE QU'ON A FAITE, PAS CELLE QU'ON AVAIT PRÉVUE
 *
 * `session.duration` est une prescription : le générateur l'écrit en même
 * temps que la séance, avant que personne ne l'ait courue. `log.minutes` est
 * une mesure : l'athlète l'a saisie en validant.
 *
 * Les écrans affichaient la première sans jamais regarder la seconde. Une
 * sortie de 5,5 km enregistrée en 36 minutes s'affichait donc « 31' » —
 * l'estimation du plan — et le chiffre juste, present en base, restait
 * invisible. C'est la faute la plus grave que puisse commettre cette
 * application : montrer autre chose que ce qui a été mesuré.
 *
 * Une mesure l'emporte toujours sur une prévision. Et quand il n'y a pas de
 * mesure, le second membre du couple le dit, pour que l'écran puisse
 * l'annoncer plutôt que de laisser croire.
 */

export interface DureeSeance {
  minutes: number
  /** `true` quand la valeur vient de ce qui a été enregistré. */
  mesuree: boolean
}

export function dureeDeLaSeance(session: Session): DureeSeance {
  const m = session.log?.minutes
  if (typeof m === 'number' && Number.isFinite(m) && m > 0) return { minutes: m, mesuree: true }
  return { minutes: session.duration ?? 0, mesuree: false }
}

/**
 * Durée pour l'affichage.
 *
 * Les secondes n'apparaissent que si elles existent : une séance de force
 * saisie en minutes rondes s'écrit « 45' », une sortie chronométrée
 * « 36:40 ». Afficher « 45:00 » partout donnerait à une valeur ronde
 * l'apparence d'un chronomètre.
 */
export function dureeEnTexte(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '—'
  const total = Math.round(minutes * 60)
  const m = Math.floor(total / 60)
  const s = total % 60
  return s === 0 ? `${m}'` : `${m}:${String(s).padStart(2, '0')}`
}

/** Les deux ensemble, pour les listes. */
export function dureeAffichee(session: Session): string {
  return dureeEnTexte(dureeDeLaSeance(session).minutes)
}
