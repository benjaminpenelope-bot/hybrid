'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { MDP_MIN } from '@/lib/validation/auth'
import { definirMotDePasse } from './mot-de-passe-actions'

/**
 * Définition ou changement du mot de passe.
 *
 * Se fait depuis une session déjà ouverte : c'est ce qui permet de passer du
 * lien e-mail au mot de passe sans jamais laisser un inconnu en poser un.
 */
export function MotDePasse({ invite }: { invite: boolean }) {
  const [pending, startTransition] = useTransition()
  const [mdp, setMdp] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [fait, setFait] = useState(false)

  const tropCourt = mdp.length > 0 && mdp.length < MDP_MIN
  const different = confirmation.length > 0 && confirmation !== mdp
  const pretAEnvoyer = mdp.length >= MDP_MIN && confirmation === mdp

  const envoyer = () => {
    setErreur(null)
    startTransition(async () => {
      const r = await definirMotDePasse(mdp, confirmation)
      if (!r.ok) setErreur(r.message ?? 'Enregistrement impossible.')
      else {
        setFait(true)
        setMdp('')
        setConfirmation('')
      }
    })
  }

  return (
    <div className="card">
      {invite && !fait && (
        <p className="mb-3 rounded-[11px] border border-ok/40 bg-ok/10 p-3 text-[12.5px] leading-relaxed text-text">
          Tu es connecté. Choisis ton nouveau mot de passe ci-dessous.
        </p>
      )}

      <p className="text-[13px] leading-relaxed text-mut">
        Définis-le ici pour te connecter sans attendre un e-mail. Le lien par e-mail restera
        disponible en secours, et cet écran sert aussi à le changer plus tard.
      </p>

      {fait ? (
        <p className="mt-3 rounded-[11px] border border-ok/40 bg-ok/10 p-3 text-[12.5px] leading-relaxed text-text">
          Mot de passe enregistré. Il servira à ta prochaine connexion.
        </p>
      ) : (
        <>
          <label className="mt-3.5 block">
            <span className="eyebrow">Nouveau mot de passe</span>
            <input
              type="password"
              value={mdp}
              autoComplete="new-password"
              onChange={(e) => setMdp(e.target.value)}
              className="mt-1.5 w-full rounded-[11px] border border-line2 bg-bg2 px-[13px] py-3 text-[15px] text-text outline-none focus:border-mut"
            />
          </label>

          <label className="mt-3 block">
            <span className="eyebrow">Confirmation</span>
            <input
              type="password"
              value={confirmation}
              autoComplete="new-password"
              onChange={(e) => setConfirmation(e.target.value)}
              className="mt-1.5 w-full rounded-[11px] border border-line2 bg-bg2 px-[13px] py-3 text-[15px] text-text outline-none focus:border-mut"
            />
          </label>

          <p className="mt-2 text-[11.5px] leading-relaxed text-dim">
            {tropCourt
              ? `Encore ${MDP_MIN - mdp.length} caractère(s).`
              : different
                ? 'Les deux saisies ne correspondent pas.'
                : `${MDP_MIN} caractères minimum.`}
          </p>

          {erreur && (
            <p className="mt-3 rounded-[11px] border border-bad/40 bg-bad/10 p-3 text-[12.5px] leading-relaxed text-text">
              {erreur}
            </p>
          )}

          <Button onClick={envoyer} disabled={!pretAEnvoyer || pending} className="mt-4">
            {pending ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
          </Button>
        </>
      )}
    </div>
  )
}
