import type { ISODate, Session } from './types'

/**
 * DÉPLACEMENT D'UNE SÉANCE DANS LA SEMAINE
 *
 * Une séance prévue peut changer de jour : la vie s'en mêle. Une séance déjà
 * réalisée, non. Elle a eu lieu un jour précis, et lui en attribuer un autre
 * réécrirait l'historique dont sortent la charge, les records et les repères.
 *
 * Quand le jour d'arrivée est un jour de repos, le repos prend la place
 * libérée plutôt que de disparaître. Une semaine garde ainsi son compte de
 * jours de repos, qui est la moitié du programme.
 */

export type RaisonRefus = 'introuvable' | 'deja-realisee' | 'meme-jour' | 'repos'

export interface Deplacement {
  ok: true
  /** Séances dont la date change, elles seules. */
  changees: { id: string; date: ISODate }[]
  /** Le repos a suivi le mouvement en sens inverse. */
  reposEchange: boolean
}

export type ResultatDeplacement = Deplacement | { ok: false; raison: RaisonRefus }

export function moveToDate(
  sessions: Session[],
  sessionId: string,
  cible: ISODate,
): ResultatDeplacement {
  const session = sessions.find((s) => s.id === sessionId)
  if (!session) return { ok: false, raison: 'introuvable' }

  // Le jour de repos n'est pas une séance qu'on déplace : il se déplace en
  // conséquence quand une séance vient prendre sa place.
  if (session.type === 'REST') return { ok: false, raison: 'repos' }

  if (session.status === 'done') return { ok: false, raison: 'deja-realisee' }
  if (session.date === cible) return { ok: false, raison: 'meme-jour' }

  const surLaCible = sessions.filter((s) => s.date === cible)
  const repos = surLaCible.find((s) => s.type === 'REST')

  const changees: { id: string; date: ISODate }[] = [{ id: session.id, date: cible }]

  // Le repos ne descend sur le jour libéré que si la séance était seule
  // dessus. Sinon il s'y ajouterait à un entraînement, ce qui ne veut rien dire.
  const seuleSurSonJour = sessions.filter((s) => s.date === session.date).length === 1
  if (repos && seuleSurSonJour) changees.push({ id: repos.id, date: session.date })

  return { ok: true, changees, reposEchange: changees.length > 1 }
}

/** Message rendu à l'athlète quand le déplacement est refusé. */
export const REFUS: Record<RaisonRefus, string> = {
  introuvable: 'Séance introuvable.',
  'meme-jour': 'La séance est déjà sur ce jour.',
  repos: 'Le repos suit les séances, il ne se déplace pas tout seul.',
  'deja-realisee':
    'Cette séance a déjà été réalisée. Lui donner une autre date fausserait ta charge et tes records : elle a eu lieu le jour où elle a eu lieu.',
}
