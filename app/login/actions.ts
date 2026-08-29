'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
  email: z.string().trim().min(1, 'Renseigne ton adresse.').email('Cette adresse ne ressemble pas à une adresse valide.'),
  suite: z.string().optional(),
})

export interface LoginState {
  status: 'idle' | 'sent' | 'error'
  message?: string
}

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: formData.get('email'),
    suite: formData.get('suite'),
  })

  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Adresse invalide.' }
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? headers().get('origin') ?? ''
  const suite = parsed.data.suite && parsed.data.suite.startsWith('/') ? parsed.data.suite : '/aujourdhui'

  const supabase = createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?suite=${encodeURIComponent(suite)}`,
    },
  })

  if (error) {
    // Supabase envoie via un SMTP mutualisé, limité à quelques mails par heure.
    // Dire « vérifie ton adresse » dans ce cas envoie l'athlète chercher une
    // erreur qui n'existe pas.
    const limite = error.status === 429 || /rate limit|too many/i.test(error.message)
    return {
      status: 'error',
      message: limite
        ? "Trop de liens demandés sur la dernière heure. Attends quelques minutes avant de réessayer — c'est une limite du service d'envoi, pas un problème avec ton adresse."
        : "L'envoi a échoué. Vérifie l'adresse, puis réessaie dans un instant.",
    }
  }

  return { status: 'sent' }
}

const motDePasseSchema = z.object({
  email: z.string().trim().min(1, 'Renseigne ton adresse.').email('Adresse invalide.'),
  password: z.string().min(1, 'Renseigne ton mot de passe.'),
  suite: z.string().optional(),
})

/**
 * Connexion par mot de passe.
 *
 * Le message d'échec est le même que l'adresse existe ou non : distinguer les
 * deux dirait à un inconnu quelles adresses ont un compte ici.
 */
export async function signInWithPassword(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = motDePasseSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    suite: formData.get('suite'),
  })

  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Saisie invalide.' }
  }

  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    const limite = error.status === 429
    return {
      status: 'error',
      message: limite
        ? 'Trop de tentatives. Attends quelques minutes.'
        : "Adresse ou mot de passe incorrect. Si tu n'as jamais défini de mot de passe, connecte-toi par lien e-mail puis crée-en un dans les réglages.",
    }
  }

  const suite = parsed.data.suite?.startsWith('/') ? parsed.data.suite : '/aujourdhui'
  redirect(suite)
}

/**
 * Envoie un lien de réinitialisation.
 *
 * Le retour est le même dans tous les cas : confirmer qu'une adresse est
 * inconnue reviendrait à publier la liste des comptes existants.
 */
export async function sendPasswordReset(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = schema.safeParse({ email: formData.get('email') })
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Adresse invalide.' }
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? headers().get('origin') ?? ''
  const supabase = createClient()
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?suite=${encodeURIComponent('/reglages?mdp=1')}`,
  })

  return { status: 'sent' }
}
