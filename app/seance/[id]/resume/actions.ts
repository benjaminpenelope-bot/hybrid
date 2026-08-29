'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient, currentUserId } from '@/lib/supabase/server'

const schema = z.object({
  sessionId: z.string().uuid(),
  rpe: z.number().int().min(1).max(10),
})

/**
 * Complète le ressenti d'une séance importée.
 *
 * L'écriture passe par le client à session, pas par la clé service : la RLS
 * vérifie que la séance appartient bien à l'athlète connecté.
 */
export async function completerRpe(
  sessionId: string,
  rpe: number,
): Promise<{ ok: boolean; message?: string }> {
  const userId = await currentUserId()
  if (!userId) return { ok: false, message: 'Session expirée.' }

  const parse = schema.safeParse({ sessionId, rpe })
  if (!parse.success) return { ok: false, message: 'Ressenti invalide.' }

  const supabase = createClient()
  const { error } = await supabase
    .from('sessions')
    .update({ rpe: parse.data.rpe })
    .eq('id', parse.data.sessionId)
    .eq('user_id', userId)

  if (error) return { ok: false, message: 'Enregistrement impossible.' }

  revalidatePath(`/seance/${sessionId}/resume`)
  revalidatePath('/aujourdhui')
  revalidatePath('/semaine')
  return { ok: true }
}
