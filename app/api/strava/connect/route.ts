import { randomBytes } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { COOKIE_ETAT, authorizeUrl, stravaConfigured } from '@/lib/strava/client'
import { chiffrementDisponible } from '@/lib/strava/crypto'
import { currentUserId } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function retour(origin: string, erreur: string) {
  return NextResponse.redirect(new URL(`/reglages?erreur=${erreur}`, origin), { status: 303 })
}

/**
 * Ouvre l'autorisation Strava.
 *
 * Le `state` est un nonce aléatoire déposé en cookie httpOnly et revérifié au
 * retour : sans lui, n'importe quel site pourrait déclencher la liaison d'un
 * compte Strava tiers sur la session de l'athlète.
 */
export async function GET(request: NextRequest) {
  const { origin } = request.nextUrl

  const userId = await currentUserId()
  if (!userId) return NextResponse.redirect(new URL('/login?suite=/reglages', origin), { status: 303 })

  if (!stravaConfigured()) return retour(origin, 'strava-non-configure')
  // Sans clé de chiffrement, les jetons finiraient en clair en base.
  if (!chiffrementDisponible()) return retour(origin, 'cle-manquante')

  const etat = randomBytes(24).toString('base64url')
  const response = NextResponse.redirect(
    authorizeUrl(new URL('/api/strava/callback', origin).toString(), etat),
    { status: 303 },
  )

  response.cookies.set(COOKIE_ETAT, etat, {
    httpOnly: true,
    sameSite: 'lax',
    secure: origin.startsWith('https://'),
    path: '/api/strava',
    maxAge: 600,
  })

  return response
}
