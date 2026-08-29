'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { demarrerEssai } from './actions'

/** Démarrage de l'essai. Aucune carte demandée, donc aucun champ à remplir. */
export function EssaiBouton({ disponible }: { disponible: boolean }) {
  const [pending, start] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [fait, setFait] = useState(false)

  if (!disponible) {
    return (
      <p className="text-[12.5px] leading-relaxed text-mut">
        Tu as déjà utilisé ton essai gratuit sur ce compte.
      </p>
    )
  }

  return (
    <div>
      <Button
        onClick={() =>
          start(async () => {
            const r = await demarrerEssai()
            setMessage(r.message)
            setFait(r.ok)
          })
        }
        disabled={pending || fait}
      >
        {pending ? 'Activation…' : fait ? 'Essai actif' : 'Démarrer mes 14 jours gratuits'}
      </Button>
      <p className="mt-2 text-[11.5px] leading-relaxed text-mut">
        Sans carte bancaire. À la fin des 14 jours, tu repasses automatiquement sur l&apos;offre
        gratuite — rien ne t&apos;est prélevé, jamais.
      </p>
      {message && (
        <p
          className={`mt-3 rounded-[11px] border p-3 text-[12.5px] leading-relaxed text-text ${
            fait ? 'border-ok/40 bg-ok/10' : 'border-bad/40 bg-bad/10'
          }`}
        >
          {message}
        </p>
      )}
    </div>
  )
}
