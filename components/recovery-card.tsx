import { teinte } from '@/lib/ui/session-meta'
import Link from 'next/link'
import { ZONES } from '@/lib/engine/recovery'
import type { Recovery, RecoveryZone } from '@/lib/engine/types'

export const ZONE_COLOR: Record<RecoveryZone, string> = {
  GREEN: 'var(--ok)',
  YELLOW: 'var(--warn)',
  RED: 'var(--bad)',
  UNKNOWN: 'var(--dim)',
}

/** Canal RVB de la zone, pour teinter un fond ou une bordure. Voir `teinte`. */
export const ZONE_CHANNEL: Record<RecoveryZone, string> = {
  GREEN: '--ok-c',
  YELLOW: '--warn-c',
  RED: '--bad-c',
  UNKNOWN: '--dim-c',
}

/**
 * Carte récupération. Tant qu'aucune composante n'est mesurée, elle affiche
 * « — » et ne conseille rien : un score de récupération sans donnée n'est pas
 * un score, c'est une case vide.
 */
export function RecoveryCard({ recovery }: { recovery: Recovery }) {
  const color = ZONE_COLOR[recovery.zone]
  const zone = ZONES[recovery.zone]

  return (
    <Link
      href="/recuperation"
      className="mt-2.5 flex items-center justify-between rounded-card border bg-card p-4"
      style={{ borderColor: teinte(ZONE_CHANNEL[recovery.zone], 0.28) }}
    >
      <span className="flex items-center gap-2.5">
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
            recovery.measured ? 'animate-pulse' : ''
          }`}
          style={{ background: color }}
          aria-hidden
        />
        <span>
          <span className="dsp block text-[15px]">{zone.label}</span>
          <span className="mt-0.5 block text-[11.5px] text-dim">
            {recovery.measured
              ? `Charge 7 j : ${recovery.l7} u · ratio ${recovery.acwr.toFixed(2)}`
              : 'Sommeil et fatigue non renseignés'}
          </span>
        </span>
      </span>
      <span className="num text-[24px]" style={{ color }}>
        {recovery.measured ? recovery.score : '—'}
      </span>
    </Link>
  )
}
