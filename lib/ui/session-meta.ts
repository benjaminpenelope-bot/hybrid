import type { SessionType } from '@/lib/engine/types'

/** Libellé, pictogramme et couleur de discipline. La couleur n'identifie rien d'autre. */
export const SESSION_META: Record<SessionType, { label: string; icon: string; color: string }> = {
  RUN: { label: 'Running', icon: '🏃', color: 'var(--run)' },
  LONG: { label: 'Sortie longue', icon: '🏃', color: 'var(--run)' },
  SWIM: { label: 'Natation', icon: '🏊', color: 'var(--swim)' },
  BIKE: { label: 'Vélo', icon: '🚴', color: 'var(--bike)' },
  RIDE: { label: 'Sortie longue vélo', icon: '🚴', color: 'var(--bike)' },
  UPPER: { label: 'Street haut', icon: '🤸', color: 'var(--street)' },
  LOWER: { label: 'Street bas', icon: '🦵', color: 'var(--legs)' },
  REST: { label: 'Récupération', icon: '😴', color: 'var(--rest)' },
}

export const STATUS_LABEL = {
  planned: 'Prévue',
  done: 'Réalisée',
  skipped: 'Sautée',
} as const

/**
 * Couleur d'un jeton avec opacité.
 *
 * `var(--run)` ne se laisse pas suffixer : écrire `` `${couleur}55` `` produit
 * `var(--run)55`, qui n'est pas une couleur valide. Le navigateur l'ignore en
 * silence, et la règle disparaît sans qu'aucune erreur ne le signale — neuf
 * bordures et fonds teintés étaient dans ce cas.
 *
 * Les canaux le permettent : `rgb(var(--run-c) / 0.33)` est valide et lisible.
 */
export function teinte(jeton: string, opacite: number): string {
  return `rgb(var(${jeton}) / ${opacite})`
}

/** Canal RVB d'une discipline, pour `teinte`. */
export const SESSION_CHANNEL: Record<SessionType, string> = {
  RUN: '--run-c',
  LONG: '--run-c',
  SWIM: '--swim-c',
  BIKE: '--bike-c',
  RIDE: '--bike-c',
  UPPER: '--street-c',
  LOWER: '--legs-c',
  REST: '--rest-c',
}
