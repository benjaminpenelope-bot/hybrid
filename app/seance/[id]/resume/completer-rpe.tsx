'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Ressenti } from '@/components/ui/ressenti'
import { completerRpe } from './actions'

/**
 * Saisie du ressenti sur une séance importée.
 *
 * Strava et Health mesurent une distance et une durée, jamais un ressenti.
 * Sans cette saisie, la charge de la séance repose sur une estimation. C'est
 * le seul endroit où l'athlète peut la remplacer par une mesure.
 */
export function CompleterRpe({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [rpe, setRpe] = useState<number | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  const envoyer = () => {
    if (rpe === null) return
    setErreur(null)
    startTransition(async () => {
      const r = await completerRpe(sessionId, rpe)
      if (!r.ok) setErreur(r.message ?? 'Enregistrement impossible.')
      else router.refresh()
    })
  }

  return (
    <section className="mt-6">
      <h2 className="eyebrow mb-2.5">Ton ressenti</h2>
      <div className="card">
        <p className="text-[13px] leading-relaxed text-mut">
          Cette séance vient d&apos;un import. La montre a mesuré la distance et la durée, pas
          l&apos;effort que ça t&apos;a demandé. Tant que tu ne le dis pas, la charge de cette
          séance reste une estimation.
        </p>

        <div className="mt-3.5">
          <Ressenti label="Comment était cette séance ?" value={rpe} onChange={setRpe} />
        </div>

        {erreur && (
          <p className="mt-3 rounded-[11px] border border-bad/40 bg-bad/10 p-3 text-[12.5px] leading-relaxed text-text">
            {erreur}
          </p>
        )}

        <Button onClick={envoyer} disabled={rpe === null || pending} className="mt-4">
          {pending ? 'Enregistrement…' : 'Enregistrer le ressenti'}
        </Button>
      </div>
    </section>
  )
}
