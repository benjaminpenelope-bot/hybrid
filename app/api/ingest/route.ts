import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { empreinteDe, jetonDeLEntete } from '@/lib/ingest/jeton'
import { ecrireSeances } from '@/lib/ingest/seances'
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

/**
 * Un nombre, meme s'il arrive en texte.
 *
 * Un raccourci iOS compose son corps JSON en collant des variables dans une
 * chaine, et il les formate selon la langue du telephone : un total de pas
 * peut arriver « 8 241 », avec une espace fine insecable, ou « 8241,0 ». Le
 * JSON reste valide — c'est une chaine — mais un `z.number()` le refuserait,
 * et l'athlete verrait une erreur incomprehensible pour un chiffre juste.
 *
 * On nettoie donc les separateurs avant de convertir. Ce qui n'est pas un
 * nombre reste refuse.
 */
const nombre = z.union([z.number(), z.string()]).transform((v, ctx) => {
  if (typeof v === 'number') return v
  const propre = v.replace(/[\s\u00a0\u202f\u2009]/g, '').replace(',', '.')
  const n = Number(propre)
  if (!Number.isFinite(n)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `« ${v} » n'est pas un nombre.` })
    return z.NEVER
  }
  return n
})

/**
 * Une seance venue d'ailleurs.
 *
 * `cle` est ce qui evite les doublons : la source doit fournir quelque chose
 * de stable pour une meme seance — un identifiant d'activite, ou a defaut
 * l'heure de debut. Absente, on la reconstitue depuis la date et la
 * discipline, ce qui suffit tant qu'on n'en fait pas deux le meme jour.
 */
const seance = z.object({
  date: jour,
  discipline: z.enum(['run', 'swim', 'bike', 'strength']),
  minutes: nombre.pipe(z.number().positive().max(1440)),
  /** Metres. Absente sur un home-trainer ou une seance de force. */
  metres: nombre.pipe(z.number().nonnegative().max(500_000)).nullable().default(null),
  fc_moyenne: nombre.pipe(z.number().int().min(25).max(240)).nullable().default(null),
  denivele: nombre.pipe(z.number().int().min(0).max(20_000)).nullable().default(null),
  cle: z.string().min(1).max(200).optional(),
})

const corps = z.object({
  pas: z
    .array(
      z.object({
        date: jour,
        pas: nombre.pipe(z.number().int().positive().max(200_000)),
      }),
    )
    .max(400)
    .default([]),
  poids: z
    .array(z.object({ date: jour, kg: nombre.pipe(z.number().min(30).max(250)) }))
    .max(400)
    .default([]),
  seances: z.array(seance).max(200).default([]),
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

  const { pas, poids, seances } = parsed.data
  if (pas.length === 0 && poids.length === 0 && seances.length === 0) {
    return refus(400, 'Rien à enregistrer : ni pas, ni pesée, ni séance.')
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

  /*
   * Les seances passent par le meme ecrivain que l'export Apple Health : une
   * seance importee se rapproche d'abord de ce qui etait prevu ce jour-la,
   * sans quoi le programme se croirait manque alors qu'il a ete suivi.
   */
  const ecrites = await ecrireSeances(
    supabase,
    profil.id,
    seances.map((s) => ({
      cle: s.cle ?? `${s.date}-${s.discipline}`,
      date: s.date,
      kind: s.discipline,
      minutes: s.minutes,
      distance: s.metres,
      hr: s.fc_moyenne,
      elev: s.denivele,
    })),
    'health',
    'Séance importée',
  )

  await supabase
    .from('profiles')
    .update({ ingest_token_last_used_at: new Date().toISOString() })
    .eq('id', profil.id)

  return NextResponse.json({
    ok: true,
    pas: pas.length,
    poids: poids.length,
    seances: ecrites,
  })
}
