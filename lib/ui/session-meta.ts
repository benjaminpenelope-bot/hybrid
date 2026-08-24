import type { SessionType } from '@/lib/engine/types'

/** Libellé, pictogramme et couleur de discipline. La couleur n'identifie rien d'autre. */
export const SESSION_META: Record<SessionType, { label: string; icon: string; color: string }> = {
  RUN: { label: 'Running', icon: '🏃', color: 'var(--run)' },
  LONG: { label: 'Sortie longue', icon: '🏃', color: 'var(--run)' },
  SWIM: { label: 'Natation', icon: '🏊', color: 'var(--swim)' },
  UPPER: { label: 'Street haut', icon: '🤸', color: 'var(--street)' },
  LOWER: { label: 'Street bas', icon: '🦵', color: 'var(--legs)' },
  REST: { label: 'Récupération', icon: '😴', color: 'var(--rest)' },
}

export const STATUS_LABEL = {
  planned: 'Prévue',
  done: 'Réalisée',
  skipped: 'Sautée',
} as const
