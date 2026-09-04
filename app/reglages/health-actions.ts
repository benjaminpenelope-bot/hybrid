'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { ecrireSeances } from '@/lib/ingest/seances'
import { createAdminClient } from '@/lib/supabase/admin'
import { currentUserId } from '@/lib/supabase/server'

/**
 * ENREGISTREMENT D'UN IMPORT APPLE HEALTH
 *
 * Le fichier `export.xml` n'arrive jamais ici : il est lu dans le navigateur
 * et seules les lignes retenues sont envoyées. Elles repassent quand même par
 * Zod, parce qu'un client reste un client, même le nôtre.
 */

const pesee = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kg: z.number().min(30).max(250),
})

const seance = z.object({
  cle: z.string().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kind: z.enum(['run', 'swim', 'strength']),
  minutes: z.number().positive().max(1440),
  distance: z.number().nonnegative().max(500_000).nullable(),
})

const jourDePas = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pas: z.number().int().positive().max(200_000),
})

/** Garde-fou : au-delà, c'est un export à découper, pas une année de suivi. */
const importHealthSchema = z.object({
  pesees: z.array(pesee).max(5000),
  seances: z.array(seance).max(5000),
  /*
   * Deux ans de pas tiennent sous cette borne. Elle est plus large que pour
   * les seances parce qu'une ligne de pas ne pese qu'un nombre.
   */
  pas: z.array(jourDePas).max(2000).default([]),
})

export type ImportHealthInput = z.infer<typeof importHealthSchema>

export interface ResultatHealth {
  ok: boolean
  message?: string
  pesees?: number
  seances?: number
  pas?: number
}

export async function importHealth(brut: unknown): Promise<ResultatHealth> {
  const userId = await currentUserId()
  if (!userId) return { ok: false, message: 'Session expirée.' }

  const parse = importHealthSchema.safeParse(brut)
  if (!parse.success) return { ok: false, message: 'Fichier illisible ou hors limites.' }

  const { pesees, seances, pas } = parse.data
  const supabase = createAdminClient()

  /*
   * Les pas rejoignent le releve du jour, qui porte deja le sommeil et la
   * fatigue. `onConflict` sur (user_id, date) evite qu'un reimport empile des
   * doublons, et `steps` seul est ecrit : un import ne doit pas effacer un
   * ressenti saisi a la main le meme jour.
   */
  if (pas.length > 0) {
    const { error } = await supabase.from('wellness').upsert(
      pas.map((j) => ({ user_id: userId, date: j.date, steps: j.pas })),
      { onConflict: 'user_id,date' },
    )
    if (error) return { ok: false, message: `Enregistrement des pas impossible : ${error.message}` }
  }

  // Une pesée par jour : la contrainte d'unicité règle les doublons entre
  // deux exports qui se recouvrent.
  if (pesees.length > 0) {
    const { error } = await supabase.from('weights').upsert(
      pesees.map((p) => ({ user_id: userId, date: p.date, kg: p.kg, source: 'health' as const })),
      { onConflict: 'user_id,date' },
    )
    if (error) return { ok: false, message: `Enregistrement des pesées impossible : ${error.message}` }
  }

  const ecrites = await ecrireSeances(
    supabase,
    userId,
    seances,
    'health',
    'Séance importée depuis Health',
  )

  revalidatePath('/reglages')
  revalidatePath('/aujourdhui')
  revalidatePath('/corps')
  revalidatePath('/semaine')

  return { ok: true, pesees: pesees.length, seances: ecrites, pas: pas.length }
}
