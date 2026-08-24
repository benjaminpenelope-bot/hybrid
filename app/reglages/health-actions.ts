'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
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

/** Garde-fou : au-delà, c'est un export à découper, pas une année de suivi. */
const importHealthSchema = z.object({
  pesees: z.array(pesee).max(5000),
  seances: z.array(seance).max(5000),
})

export type ImportHealthInput = z.infer<typeof importHealthSchema>

export interface ResultatHealth {
  ok: boolean
  message?: string
  pesees?: number
  seances?: number
}

const TYPE_PAR_DISCIPLINE = { run: 'RUN', swim: 'SWIM', strength: 'UPPER' } as const

export async function importHealth(brut: unknown): Promise<ResultatHealth> {
  const userId = await currentUserId()
  if (!userId) return { ok: false, message: 'Session expirée.' }

  const parse = importHealthSchema.safeParse(brut)
  if (!parse.success) return { ok: false, message: 'Fichier illisible ou hors limites.' }

  const { pesees, seances } = parse.data
  const supabase = createAdminClient()

  // Une pesée par jour : la contrainte d'unicité règle les doublons entre
  // deux exports qui se recouvrent.
  if (pesees.length > 0) {
    const { error } = await supabase.from('weights').upsert(
      pesees.map((p) => ({ user_id: userId, date: p.date, kg: p.kg, source: 'health' as const })),
      { onConflict: 'user_id,date' },
    )
    if (error) return { ok: false, message: `Enregistrement des pesées impossible : ${error.message}` }
  }

  let ecrites = 0
  if (seances.length > 0) {
    const dates = [...new Set(seances.map((s) => s.date))]
    const { data } = await supabase
      .from('sessions')
      .select('id, date, kind, status, note')
      .eq('user_id', userId)
      .in('date', dates)

    const existantes = (data ?? []) as {
      id: string
      date: string
      kind: string
      status: string
      note: string | null
    }[]

    for (const s of seances) {
      // Health ne donne pas de clé stable : on la range dans la note pour
      // qu'un réimport reconnaisse la séance au lieu de la dupliquer.
      const marque = `health:${s.cle}`
      if (existantes.some((e) => e.note?.includes(marque))) continue

      const log =
        s.kind === 'run'
          ? { km: s.distance === null ? null : Math.round((s.distance / 1000) * 100) / 100, minutes: s.minutes, hr: null, elev: null }
          : s.kind === 'swim'
            ? // Health ne dit pas ce qui a été nagé en continu, ni comment.
              { minutes: s.minutes, distance: s.distance, continuous: null, pauses: null, stroke: null, crawl: null }
            : { minutes: s.minutes }

      const champs = {
        status: 'done' as const,
        kind: s.kind,
        duration: Math.round(s.minutes),
        log,
        // Health ne mesure aucun ressenti : la colonne reste vide.
        rpe: null,
        source: 'health' as const,
        note: marque,
      }

      const prevue = existantes.find(
        (e) => e.date === s.date && e.kind === s.kind && e.status !== 'done',
      )

      if (prevue) {
        await supabase.from('sessions').update(champs).eq('id', prevue.id)
        prevue.status = 'done'
        prevue.note = marque
      } else {
        await supabase.from('sessions').insert({
          user_id: userId,
          date: s.date,
          type: TYPE_PAR_DISCIPLINE[s.kind],
          week: 0,
          title: 'Séance importée depuis Health',
          intensity: 0,
          unplanned: true,
          ...champs,
        })
        existantes.push({ id: 'nouvelle', date: s.date, kind: s.kind, status: 'done', note: marque })
      }
      ecrites++
    }
  }

  revalidatePath('/reglages')
  revalidatePath('/')
  revalidatePath('/corps')
  revalidatePath('/semaine')

  return { ok: true, pesees: pesees.length, seances: ecrites }
}
