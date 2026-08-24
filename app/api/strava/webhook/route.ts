import { timingSafeEqual } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { StravaNonAutorise, fetchActivity } from '@/lib/strava/client'
import { accessTokenFor, forgetTokens, userIdForAthlete } from '@/lib/strava/store'
import { importActivities } from '@/lib/strava/sync'

export const dynamic = 'force-dynamic'

/**
 * WEBHOOK STRAVA
 *
 * Appelé par Strava, sans session : c'est la seule route de l'app dans ce cas.
 * Elle est donc écrite en supposant que n'importe qui peut l'appeler.
 *
 * Ce qui la protège : l'événement ne porte qu'un identifiant d'activité, et
 * rien n'est cru sur parole. L'activité est relue depuis l'API avec le jeton
 * de l'athlète concerné. Un faux événement ne peut donc qu'entraîner une
 * relecture d'une activité que l'athlète possède déjà.
 */

const evenement = z.object({
  object_type: z.enum(['activity', 'athlete']),
  object_id: z.number(),
  aspect_type: z.enum(['create', 'update', 'delete']),
  owner_id: z.number(),
  updates: z.record(z.unknown()).optional(),
})

/** Vérification d'abonnement : Strava renvoie le défi à l'identique. */
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const attendu = process.env.STRAVA_VERIFY_TOKEN
  const recu = params.get('hub.verify_token')

  if (
    params.get('hub.mode') !== 'subscribe' ||
    !attendu ||
    !recu ||
    attendu.length !== recu.length ||
    !timingSafeEqual(Buffer.from(attendu), Buffer.from(recu))
  ) {
    return NextResponse.json({ error: 'Vérification refusée.' }, { status: 403 })
  }

  return NextResponse.json({ 'hub.challenge': params.get('hub.challenge') })
}

export async function POST(request: NextRequest) {
  // Strava réémet tout événement non acquitté en moins de deux secondes. On
  // répond 200 dans tous les cas de figure prévus, sinon la file se rejoue.
  const ok = NextResponse.json({ recu: true })

  const parse = evenement.safeParse(await request.json().catch(() => null))
  if (!parse.success) return ok

  const { object_type, object_id, aspect_type, owner_id, updates } = parse.data

  const userId = await userIdForAthlete(owner_id)
  if (!userId) return ok

  // Désautorisation depuis Strava : on oublie les jetons sans attendre.
  if (object_type === 'athlete' && updates?.authorized === 'false') {
    await forgetTokens(userId)
    return ok
  }

  if (object_type !== 'activity') return ok

  try {
    if (aspect_type === 'delete') {
      await effacerSeanceImportee(userId, object_id)
      return ok
    }

    const token = await accessTokenFor(userId)
    if (!token) return ok

    await importActivities(userId, [await fetchActivity(token, object_id)])
  } catch (error) {
    if (error instanceof StravaNonAutorise) await forgetTokens(userId)
    // Toute autre panne est passagère : inutile de faire rejouer Strava en
    // boucle, la synchronisation manuelle rattrapera l'activité.
  }

  return ok
}

/**
 * Une activité supprimée chez Strava disparaît chez nous, mais seulement si
 * elle venait de l'import. Une séance saisie à la main n'appartient pas
 * à Strava.
 */
async function effacerSeanceImportee(userId: string, activityId: number): Promise<void> {
  const { createAdminClient } = await import('@/lib/supabase/admin')
  await createAdminClient()
    .from('sessions')
    .delete()
    .eq('user_id', userId)
    .eq('strava_activity_id', activityId)
    .eq('source', 'strava')
}
