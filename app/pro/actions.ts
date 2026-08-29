'use server'

import { revalidatePath } from 'next/cache'
import { JOURS_ESSAI, lireAbonnement } from '@/lib/coach/abonnement'
import { createAdminClient } from '@/lib/supabase/admin'
import { currentUserId } from '@/lib/supabase/server'

/**
 * Démarrage de l'essai gratuit.
 *
 * Sans carte bancaire, quatorze jours, puis retour automatique à l'offre
 * gratuite — le retour se déduit de la date de fin, rien ne l'exécute.
 *
 * L'identifiant vient de la session, jamais d'un paramètre : une action qui
 * accepterait un `userId` du client offrirait l'abonnement à n'importe qui.
 */
export async function demarrerEssai(): Promise<{ ok: boolean; message: string }> {
  const userId = await currentUserId()
  if (!userId) return { ok: false, message: 'Session expirée. Reconnecte-toi.' }

  /*
   * Un seul essai par compte, definitivement. Sans cette garde, resilier puis
   * recommencer suffirait a rester en PRO sans jamais payer.
   */
  const existant = await lireAbonnement(userId)
  if (existant?.essaiUtilise) {
    return { ok: false, message: 'Tu as déjà utilisé ton essai gratuit sur ce compte.' }
  }

  const fin = new Date()
  fin.setDate(fin.getDate() + JOURS_ESSAI)

  const db = createAdminClient()
  const { error } = await db.from('subscriptions').upsert(
    {
      user_id: userId,
      status: 'essai',
      source: 'manuel',
      periode_fin: fin.toISOString(),
      essai_utilise: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )

  if (error) return { ok: false, message: "L'essai n'a pas pu démarrer. Réessaie dans un moment." }

  revalidatePath('/coach')
  revalidatePath('/pro')
  return { ok: true, message: `Ton essai est actif pour ${JOURS_ESSAI} jours.` }
}
