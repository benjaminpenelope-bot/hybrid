'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { ouvrirPaiement, ouvrirPortail } from './actions'
import type { Periodicite } from '@/lib/paiement/stripe'

/**
 * Départ vers Stripe. Aucune donnée bancaire ne transite par HYBRID : la
 * saisie se fait chez Stripe, sur ses pages.
 */
export function PaiementBoutons({ prix }: { prix: { mensuel: string; annuel: string } }) {
  const [pending, start] = useTransition()
  const [erreur, setErreur] = useState<string | null>(null)

  const aller = (p: Periodicite) =>
    start(async () => {
      setErreur(null)
      const r = await ouvrirPaiement(p)
      if (r.ok && r.url) window.location.href = r.url
      else setErreur(r.message ?? 'Ouverture impossible.')
    })

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={() => aller('mensuel')} disabled={pending}>
          {prix.mensuel} par mois
        </Button>
        <Button onClick={() => aller('annuel')} disabled={pending} variant="ghost">
          {prix.annuel} par an
        </Button>
      </div>
      <p className="mt-2 text-[11.5px] leading-relaxed text-mut">
        Le paiement se fait chez Stripe. Aucune donnée bancaire ne passe par HYBRID.
      </p>
      {erreur && (
        <p className="mt-3 rounded-[11px] border border-bad/40 bg-bad/10 p-3 text-[12.5px] leading-relaxed text-text">
          {erreur}
        </p>
      )}
    </div>
  )
}

/** Gestion de l'abonnement : moyen de paiement, factures, résiliation. */
export function PortailBouton() {
  const [pending, start] = useTransition()
  const [erreur, setErreur] = useState<string | null>(null)

  return (
    <div>
      <Button
        variant="ghost"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setErreur(null)
            const r = await ouvrirPortail()
            if (r.ok && r.url) window.location.href = r.url
            else setErreur(r.message ?? 'Ouverture impossible.')
          })
        }
      >
        {pending ? 'Ouverture…' : 'Gérer ou résilier mon abonnement'}
      </Button>
      {erreur && (
        <p className="mt-3 rounded-[11px] border border-bad/40 bg-bad/10 p-3 text-[12.5px] leading-relaxed text-text">
          {erreur}
        </p>
      )}
    </div>
  )
}
