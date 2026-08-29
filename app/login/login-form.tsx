'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { MDP_MIN } from '@/lib/validation/auth'
import {
  sendMagicLink,
  sendPasswordReset,
  signInWithPassword,
  signUpWithPassword,
  type LoginState,
} from './actions'

const INITIAL: LoginState = { status: 'idle' }

/**
 * Connexion par Apple et Google.
 *
 * Masquée tant que les fournisseurs ne sont pas activés côté Supabase. Un
 * bouton qui échoue à chaque clic coûte plus cher qu'un bouton absent : la
 * personne croit que l'application est cassée, pas qu'une option lui manque.
 *
 * Le code reste en place. Une fois Apple et Google configurés dans Supabase,
 * il suffit de repasser cette constante à `true`.
 */
const OAUTH_ACTIF = false

/** Trois façons d'entrer, une seule affichée à la fois. */
type Mode = 'mot-de-passe' | 'inscription' | 'lien' | 'oubli'

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  )
}

const CHAMP =
  'mb-3 w-full rounded-[11px] border border-line2 bg-bg2 px-[13px] py-3 text-base text-text outline-none transition-colors focus:border-mut'

export function LoginForm({ suite, erreur }: { suite: string; erreur?: string }) {
  const [mode, setMode] = useState<Mode>('mot-de-passe')
  const [mdpState, mdpAction] = useFormState(signInWithPassword, INITIAL)
  const [lienState, lienAction] = useFormState(sendMagicLink, INITIAL)
  const [oubliState, oubliAction] = useFormState(sendPasswordReset, INITIAL)
  const [inscriptionState, inscriptionAction] = useFormState(signUpWithPassword, INITIAL)
  const [oauthError, setOauthError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'google' | 'apple' | null>(null)

  const state =
    mode === 'mot-de-passe'
      ? mdpState
      : mode === 'inscription'
        ? inscriptionState
        : mode === 'lien'
          ? lienState
          : oubliState

  const signInWith = async (provider: 'google' | 'apple') => {
    setBusy(provider)
    setOauthError(null)
    const supabase = createClient()
    const origin = window.location.origin
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${origin}/auth/callback?suite=${encodeURIComponent(suite)}` },
    })
    if (error) {
      setBusy(null)
      setOauthError(
        `Connexion ${provider === 'google' ? 'Google' : 'Apple'} indisponible : le fournisseur n'est pas activé sur ce projet.`,
      )
    }
  }

  if (state.status === 'sent') {
    return (
      <div className="card mt-6">
        <h2 className="dsp text-[19px]">Regarde tes mails</h2>
        <p className="mt-3 text-[13.5px] leading-relaxed text-mut">
          {mode === 'oubli'
            ? "Si un compte existe pour cette adresse, un lien vient de partir. Il te ramènera ici, connecté, sur l'écran où définir un nouveau mot de passe."
            : mode === 'inscription'
              ? "Si cette adresse n'a pas déjà de compte, un mail de confirmation vient de partir. Ouvre-le pour activer ton compte : ce sera le seul mail nécessaire, tu te connecteras ensuite avec ton mot de passe."
              : 'Un lien de connexion vient de partir. Il est valable une heure et ne fonctionne qu’une fois. Ouvre-le depuis ce téléphone pour rester connecté ici.'}
        </p>
      </div>
    )
  }

  return (
    <div className="mt-6">
      {erreur && (
        <p className="mb-4 rounded-[11px] border border-bad/40 bg-bad/10 p-3 text-[12.5px] leading-relaxed text-text">
          {erreur === 'lien_autre_navigateur'
            ? "Ce lien a été demandé depuis un autre navigateur que celui-ci. Pour des raisons de sécurité il ne fonctionne que là où il a été demandé. Redemande-en un depuis cet appareil, ou connecte-toi avec ton mot de passe."
            : erreur === 'lien_expire'
              ? 'Ce lien a expiré ou a déjà servi. Demandes-en un nouveau.'
              : 'Ce lien est invalide. Demandes-en un nouveau.'}
        </p>
      )}

      {mode === 'mot-de-passe' && (
        <form action={mdpAction}>
          <input type="hidden" name="suite" value={suite} />
          <label htmlFor="email" className="eyebrow mb-[7px] block">
            Adresse e-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            placeholder="toi@exemple.fr"
            className={CHAMP}
          />
          <label htmlFor="password" className="eyebrow mb-[7px] block">
            Mot de passe
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={CHAMP}
          />
          {mdpState.status === 'error' && (
            <p className="mb-3 text-[12.5px] leading-relaxed text-bad">{mdpState.message}</p>
          )}
          <SubmitButton label="Se connecter" pendingLabel="Connexion…" />

          <div className="mt-3 flex items-center justify-between gap-3">
            <button type="button" onClick={() => setMode('lien')} className="eyebrow text-dim">
              Recevoir un lien
            </button>
            <button type="button" onClick={() => setMode('oubli')} className="eyebrow text-dim">
              Mot de passe oublié
            </button>
          </div>

          <p className="mt-4 border-t border-line pt-4 text-[12.5px] leading-relaxed text-mut">
            Pas encore de compte ?{' '}
            <button
              type="button"
              onClick={() => setMode('inscription')}
              className="text-text underline"
            >
              En créer un
            </button>
          </p>
        </form>
      )}

      {/*
        L'inscription pose un mot de passe tout de suite. Sans elle, un
        nouveau venu passait par le lien magique et arrivait sans mot de
        passe : il en redemandait un a chaque visite, soit un e-mail par
        connexion sur un service d'envoi plafonne.
      */}
      {mode === 'inscription' && (
        <form action={inscriptionAction}>
          <input type="hidden" name="suite" value={suite} />
          <label htmlFor="email-inscription" className="eyebrow mb-[7px] block">
            Adresse e-mail
          </label>
          <input
            id="email-inscription"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            placeholder="toi@exemple.fr"
            className={CHAMP}
          />
          <label htmlFor="password-inscription" className="eyebrow mb-[7px] block">
            Mot de passe
          </label>
          <input
            id="password-inscription"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={MDP_MIN}
            required
            className={CHAMP}
          />
          <label htmlFor="confirmation-inscription" className="eyebrow mb-[7px] block">
            Confirme ton mot de passe
          </label>
          <input
            id="confirmation-inscription"
            name="confirmation"
            type="password"
            autoComplete="new-password"
            minLength={MDP_MIN}
            required
            className={CHAMP}
          />
          <p className="mb-3 text-[11.5px] leading-relaxed text-dim">
            {MDP_MIN} caractères minimum. Un seul mail te sera envoyé, pour confirmer ton
            adresse.
          </p>
          {inscriptionState.status === 'error' && (
            <p className="mb-3 text-[12.5px] leading-relaxed text-bad">{inscriptionState.message}</p>
          )}
          <SubmitButton label="Créer mon compte" pendingLabel="Création…" />
          <button
            type="button"
            onClick={() => setMode('mot-de-passe')}
            className="eyebrow mt-3 block text-dim"
          >
            J&apos;ai déjà un compte
          </button>
        </form>
      )}

      {mode === 'lien' && (
        <form action={lienAction}>
          <input type="hidden" name="suite" value={suite} />
          <label htmlFor="email-lien" className="eyebrow mb-[7px] block">
            Adresse e-mail
          </label>
          <input
            id="email-lien"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            placeholder="toi@exemple.fr"
            className={CHAMP}
          />
          {lienState.status === 'error' && (
            <p className="mb-3 text-[12.5px] leading-relaxed text-bad">{lienState.message}</p>
          )}
          <SubmitButton label="Recevoir le lien" pendingLabel="Envoi…" />
          <button
            type="button"
            onClick={() => setMode('mot-de-passe')}
            className="eyebrow mt-3 block text-dim"
          >
            Utiliser mon mot de passe
          </button>
        </form>
      )}

      {mode === 'oubli' && (
        <form action={oubliAction}>
          <p className="mb-3 text-[12.5px] leading-relaxed text-mut">
            On t&apos;envoie un lien qui te reconnecte et t&apos;amène directement là où
            définir un nouveau mot de passe.
          </p>
          <label htmlFor="email-oubli" className="eyebrow mb-[7px] block">
            Adresse e-mail
          </label>
          <input
            id="email-oubli"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            placeholder="toi@exemple.fr"
            className={CHAMP}
          />
          {oubliState.status === 'error' && (
            <p className="mb-3 text-[12.5px] leading-relaxed text-bad">{oubliState.message}</p>
          )}
          <SubmitButton label="Envoyer le lien" pendingLabel="Envoi…" />
          <button
            type="button"
            onClick={() => setMode('mot-de-passe')}
            className="eyebrow mt-3 block text-dim"
          >
            Revenir à la connexion
          </button>
        </form>
      )}

      {OAUTH_ACTIF && (
        <>
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="eyebrow text-[9.5px]">ou</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <div className="flex flex-col gap-2">
            <Button variant="ghost" onClick={() => signInWith('apple')} disabled={busy !== null}>
              Continuer avec Apple
            </Button>
            <Button variant="ghost" onClick={() => signInWith('google')} disabled={busy !== null}>
              Continuer avec Google
            </Button>
          </div>

          {oauthError && (
            <p className="mt-3 text-[12.5px] leading-relaxed text-bad">{oauthError}</p>
          )}
        </>
      )}

      <p className="mt-6 text-[11.5px] leading-relaxed text-dim">
        Tes données d&apos;entraînement, tes photos et tes mesures ne sont visibles que par toi.
        Aucune n&apos;est partagée.
      </p>
    </div>
  )
}
