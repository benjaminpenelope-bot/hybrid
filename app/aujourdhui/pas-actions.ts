'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

/**
 * SAISIE MANUELLE DES PAS
 *
 * Toutes les montres ne se synchronisent pas, et l'export Apple Health ne se
 * fait pas tous les jours. Sans saisie à la main, le compteur ne dirait rien
 * à qui n'a pas d'iPhone — et une donnée qu'on ne peut pas corriger finit par
 * ne plus être regardée.
 */

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide.'),
  pas: z.number().int().positive('Un compte de pas est positif.').max(200_000),
})

export type ResultatPas = { ok: true } | { ok: false; message: string }

export async function enregistrerPas(brut: unknown): Promise<ResultatPas> {
  const parsed = schema.safeParse(brut)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Saisie invalide.' }
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Session expirée.' }

  /*
   * `onConflict` sur (user_id, date) : le relevé du jour existe peut-être
   * déjà, avec un sommeil et une fatigue saisis après une séance. On n'écrit
   * que la colonne des pas, sans quoi une correction effacerait le ressenti.
   */
  const { error } = await supabase
    .from('wellness')
    .upsert(
      { user_id: user.id, date: parsed.data.date, steps: parsed.data.pas },
      { onConflict: 'user_id,date' },
    )
  if (error) return { ok: false, message: error.message }

  revalidatePath('/aujourdhui')
  revalidatePath('/corps')
  return { ok: true }
}
