import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { empreinteDe, jetonDeLEntete } from '@/lib/ingest/jeton'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * IMPORT AUTOMATIQUE
 *
 * Le téléphone envoie, le serveur enregistre. C'est le seul sens possible :
 * HealthKit n'est lisible que depuis une application native, donc aucun
 * serveur ne peut aller y chercher quoi que ce soit. Un raccourci iOS
 * déclenché chaque jour, ou une application d'export automatique, appelle
 * cette adresse avec le jeton de l'athlète.
 *
 * Elle accepte aussi bien un envoi quotidien qu'un rattrapage de plusieurs
 * semaines : tout est écrit en `upsert` sur (utilisateur, date), donc renvoyer
 * deux fois la même journée ne crée pas de doublon et corrige la précédente.
 *
 * Ce que le serveur refuse d'inventer reste absent : ni ressenti, ni RPE, ni
 * distance déduite d'une durée.
 */

export const dynamic = 'force-dynamic'

const jour = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date attendue au format AAAA-MM-JJ.')

const corps = z.object({
  pas: z
    .array(z.object({ date: jour, pas: z.number().int().positive().max(200_000) }))
    .max(400)
    .default([]),
  poids: z
    .array(z.object({ date: jour, kg: z.number().min(30).max(250) }))
    .max(400)
    .default([]),
})

export type IngestInput = z.input<typeof corps>

function refus(statut: number, message: string) {
  return NextResponse.json({ ok: false, message }, { status: statut })
}

export async function POST(request: NextRequest) {
  const jeton = jetonDeLEntete(request.headers.get('authorization'))
  if (!jeton) return refus(401, 'Jeton manquant. Attendu : Authorization: Bearer <jeton>.')

  const supabase = createAdminClient()

  /*
   * On cherche par empreinte plutot que de parcourir les comptes : la colonne
   * est unique et indexee, et le jeton en clair ne quitte jamais cette ligne
   * de code. La comparaison a temps constant n'a plus lieu d'etre ici — c'est
   * l'index qui repond, pas une boucle sur des chaines.
   */
  const { data: profil } = await supabase
    .from('profiles')
    .select('id')
    .eq('ingest_token_hash', empreinteDe(jeton))
    .maybeSingle<{ id: string }>()
  if (!profil) return refus(401, 'Jeton inconnu ou révoqué.')

  let brut: unknown
  try {
    brut = await request.json()
  } catch {
    return refus(400, 'Corps JSON illisible.')
  }

  const parsed = corps.safeParse(brut)
  if (!parsed.success) {
    return refus(400, parsed.error.issues[0]?.message ?? 'Envoi invalide.')
  }

  const { pas, poids } = parsed.data
  if (pas.length === 0 && poids.length === 0) {
    return refus(400, 'Rien à enregistrer : ni pas, ni pesée.')
  }

  if (pas.length > 0) {
    /*
     * Seule la colonne des pas est ecrite : le releve du jour porte aussi le
     * sommeil et la fatigue, saisis a la main apres une seance, qu'un envoi
     * automatique ne doit pas effacer.
     */
    const { error } = await supabase.from('wellness').upsert(
      pas.map((j) => ({ user_id: profil.id, date: j.date, steps: j.pas })),
      { onConflict: 'user_id,date' },
    )
    if (error) return refus(500, `Pas non enregistrés : ${error.message}`)
  }

  if (poids.length > 0) {
    const { error } = await supabase.from('weights').upsert(
      poids.map((p) => ({ user_id: profil.id, date: p.date, kg: p.kg, source: 'health' as const })),
      { onConflict: 'user_id,date' },
    )
    if (error) return refus(500, `Pesées non enregistrées : ${error.message}`)
  }

  await supabase
    .from('profiles')
    .update({ ingest_token_last_used_at: new Date().toISOString() })
    .eq('id', profil.id)

  return NextResponse.json({ ok: true, pas: pas.length, poids: poids.length })
}
