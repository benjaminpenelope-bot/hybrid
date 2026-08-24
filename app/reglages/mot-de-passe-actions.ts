'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { MDP_MIN } from '@/lib/validation/auth'
import { createClient } from '@/lib/supabase/server'

/**
 * Pose le mot de passe du compte connecté.
 *
 * `updateUser` agit sur la session en cours : impossible de changer le mot de
 * passe de quelqu'un d'autre, il n'y a rien à vérifier de plus côté serveur.
 * La confirmation est revalidée ici et pas seulement dans le navigateur.
 */
const schema = z
  .object({
    password: z.string().min(MDP_MIN, `${MDP_MIN} caractères minimum.`).max(200),
    confirmation: z.string(),
  })
  .refine((v) => v.password === v.confirmation, {
    message: 'Les deux saisies ne correspondent pas.',
  })

export async function definirMotDePasse(
  password: string,
  confirmation: string,
): Promise<{ ok: boolean; message?: string }> {
  const parsed = schema.safeParse({ password, confirmation })
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Mot de passe invalide.' }
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Session expirée.' }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) {
    // Supabase refuse notamment un mot de passe identique au précédent.
    return { ok: false, message: "Ce mot de passe a été refusé. Essaie-en un autre." }
  }

  revalidatePath('/reglages')
  return { ok: true }
}
