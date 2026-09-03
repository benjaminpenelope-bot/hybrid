import {
  IconBarre,
  IconCourse,
  IconJambes,
  IconNatation,
  IconRepos,
  IconVelo,
} from '@/components/ui/icons'
import type { SessionType } from '@/lib/engine/types'

/**
 * Libellé, glyphe et couleur de discipline. La couleur n'identifie rien
 * d'autre.
 *
 * Le glyphe est un composant, plus un émoji. Un émoji est dessiné par le
 * système : il porte sa propre couleur, sa propre graisse et son propre
 * style, tous hors de portée de l'interface. Sur une pastille teintée à la
 * couleur de la discipline, il entrait en concurrence avec elle.
 */
export const SESSION_META: Record<
  SessionType,
  { label: string; Icon: (p: { size?: number }) => React.ReactElement; color: string }
> = {
  RUN: { label: 'Running', Icon: IconCourse, color: 'var(--run)' },
  LONG: { label: 'Sortie longue', Icon: IconCourse, color: 'var(--run)' },
  SWIM: { label: 'Natation', Icon: IconNatation, color: 'var(--swim)' },
  BIKE: { label: 'Vélo', Icon: IconVelo, color: 'var(--bike)' },
  RIDE: { label: 'Sortie longue vélo', Icon: IconVelo, color: 'var(--bike)' },
  UPPER: { label: 'Street haut', Icon: IconBarre, color: 'var(--street)' },
  LOWER: { label: 'Street bas', Icon: IconJambes, color: 'var(--legs)' },
  REST: { label: 'Récupération', Icon: IconRepos, color: 'var(--rest)' },
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
