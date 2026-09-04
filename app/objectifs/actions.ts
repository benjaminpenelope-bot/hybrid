'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { todayISO } from '@/lib/engine/date'
import { createClient } from '@/lib/supabase/server'

/**
 * LIMITATIONS : LES CLORE, ET EN AJOUTER
 *
 * Une contrainte se déclarait à l'inscription et n'en sortait jamais. Un
 * genou déclaré en août restait « en cours » un an plus tard : le coach en
 * tenait compte à chaque réponse, et l'écran du jour continuait de le
 * rappeler dans ses preuves. Une blessure guérie devenait une blessure
 * éternelle.
 *
 * La colonne `ended_on` existait depuis le premier jour, et le moteur savait
 * déjà distinguer une limitation en cours d'un antécédent — voir
 * `limitationsActives`. Il ne manquait que le geste.
 *
 * Clore n'efface rien : la ligne reste, avec sa date de fin. Un antécédent
 * fait partie de l'histoire d'un corps, et le supprimer reviendrait à faire
 * comme s'il n'avait pas eu lieu.
 */

const idSchema = z.string().uuid()

const nouvelleSchema = z.object({
  zone: z.string().trim().min(1, 'Indique la zone concernée.').max(60),
  description: z.string().trim().max(300),
})

export type LimitationResult = { ok: true } | { ok: false; message: string }

async function utilisateur() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

/** Marque une limitation comme terminée aujourd'hui. */
export async function cloreLimitation(id: string): Promise<LimitationResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, message: 'Limitation inconnue.' }

  const { supabase, user } = await utilisateur()
  if (!user) return { ok: false, message: 'Session expirée.' }

  const { error } = await supabase
    .from('limitations')
    .update({ ended_on: todayISO() })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return { ok: false, message: error.message }

  revalidatePath('/objectifs')
  revalidatePath('/aujourdhui')
  return { ok: true }
}

/** Rouvre une limitation close par erreur. */
export async function rouvrirLimitation(id: string): Promise<LimitationResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, message: 'Limitation inconnue.' }

  const { supabase, user } = await utilisateur()
  if (!user) return { ok: false, message: 'Session expirée.' }

  const { error } = await supabase
    .from('limitations')
    .update({ ended_on: null })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return { ok: false, message: error.message }

  revalidatePath('/objectifs')
  revalidatePath('/aujourdhui')
  return { ok: true }
}

/**
 * Déclare une nouvelle contrainte.
 *
 * Elle ne se déclarait qu'au questionnaire : une gêne apparue en cours de
 * route n'avait aucun endroit où être dite, sinon en repassant l'inscription
 * entière — ce qui régénérait le programme au passage.
 */
export async function ajouterLimitation(input: unknown): Promise<LimitationResult> {
  const parsed = nouvelleSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Saisie invalide.' }
  }

  const { supabase, user } = await utilisateur()
  if (!user) return { ok: false, message: 'Session expirée.' }

  const { error } = await supabase.from('limitations').insert({
    user_id: user.id,
    zone: parsed.data.zone,
    description: parsed.data.description || null,
    started_on: todayISO(),
  })
  if (error) return { ok: false, message: error.message }

  revalidatePath('/objectifs')
  revalidatePath('/aujourdhui')
  return { ok: true }
}
