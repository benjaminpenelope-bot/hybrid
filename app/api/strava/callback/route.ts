import { timingSafeEqual } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { COOKIE_ETAT, exchangeCode } from '@/lib/strava/client'
import { saveTokens } from '@/lib/strava/store'
import { currentUserId } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function memeEtat(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

/**
 * Retour d'autorisation Strava.
 *
 * Trois vérifications avant d'écrire quoi que ce soit : une session valide,
 * un nonce qui correspond au cookie posé à l'aller, et un scope de lecture
 * réellement accordé. Un refus partiel donnerait une connexion qui échoue
 * plus tard sans qu'on sache pourquoi.
 */
export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl
  const echec = (motif: string) =>
    NextResponse.redirect(new URL(`/reglages?erreur=${motif}`, origin), { status: 303 })

  const userId = await currentUserId()
  if (!userId) return NextResponse.redirect(new URL('/login', origin), { status: 303 })

  // L'athlète a cliqué « Annuler » sur l'écran Strava.
  if (searchParams.get('error')) return echec('autorisation-refusee')

  const attendu = request.cookies.get(COOKIE_ETAT)?.value
  const recu = searchParams.get('state')
  if (!attendu || !recu || !memeEtat(attendu, recu)) return echec('etat-invalide')

  const code = searchParams.get('code')
  if (!code) return echec('code-manquant')

  // Sans `activity:read_all`, les sorties privées resteraient invisibles et
  // l'app afficherait des semaines incomplètes en les croyant complètes.
  if (!searchParams.get('scope')?.includes('activity:read_all')) return echec('lecture-refusee')

  try {
    await saveTokens(userId, await exchangeCode(code))
  } catch {
    // Rien de l'erreur d'origine n'est renvoyé : elle peut contenir un jeton.
    return echec('echange-impossible')
  }

  const response = NextResponse.redirect(new URL('/reglages?strava=connecte', origin), {
    status: 303,
  })
  response.cookies.delete(COOKIE_ETAT)
  return response
}
