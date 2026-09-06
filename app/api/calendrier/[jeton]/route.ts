import { NextResponse } from 'next/server'
import { calendrierIcs } from '@/lib/calendrier/ics'
import { compteDuJeton } from '@/lib/calendrier/jeton'
import { estPro, lireAbonnement } from '@/lib/coach/abonnement'
import { todayISO } from '@/lib/engine/date'
import { stateFromRows } from '@/lib/db/mappers'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * CALENDRIER DU PROGRAMME
 *
 * Appelée par une application de calendrier, jamais par un navigateur
 * connecté : il n'y a donc ni cookie ni session, et c'est le jeton signé de
 * l'adresse qui identifie le compte. Voir `lib/calendrier/jeton`.
 *
 * La lecture passe par la clé service parce qu'aucune session n'existe pour
 * porter la RLS. Le filtrage sur `user_id` en tient lieu, et il est ici la
 * seule barrière : d'où le fait qu'il apparaisse sur chacune des requêtes.
 */

export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: { jeton: string } }) {
  // Le nom de fichier est colle au jeton pour que les clients de calendrier
  // affichent quelque chose de lisible : on le retire avant de verifier.
  const jeton = params.jeton.replace(/\.ics$/i, '')
  const userId = compteDuJeton(jeton)
  if (!userId) {
    return new NextResponse('Lien de calendrier invalide ou révoqué.', { status: 404 })
  }

  const abonnement = await lireAbonnement(userId)
  if (!estPro(abonnement, new Date())) {
    /*
     * 404 plutot que 403 : une application de calendrier n'a pas d'ecran pour
     * expliquer un refus, elle n'a qu'un message d'erreur. Autant ne pas
     * confirmer qu'un lien existe pour un compte qui ne peut pas s'en servir.
     */
    return new NextResponse('Calendrier réservé à HYBRID PRO.', { status: 404 })
  }

  const db = createAdminClient()
  const [profile, sessions] = await Promise.all([
    db.from('profiles').select('*').eq('id', userId).maybeSingle(),
    db.from('sessions').select('*').eq('user_id', userId).order('date'),
  ])
  if (!profile.data) return new NextResponse('Compte introuvable.', { status: 404 })

  const state = stateFromRows({
    profile: profile.data,
    sessions: sessions.data ?? [],
    weights: [],
    measurements: [],
    photos: [],
    wellness: [],
    benchmarks: [],
    records: [],
    goals: [],
    limitations: [],
  })

  const ics = calendrierIcs(state, todayISO())

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="hybrid.ics"',
      // Le client rafraichit de lui-meme ; on lui evite juste de relire un
      // fichier identique dans la minute.
      'Cache-Control': 'private, max-age=300',
    },
  })
}
