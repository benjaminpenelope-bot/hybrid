import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Retour d'un lien magique ou d'une connexion OAuth.
 * Échange le code contre une session, puis renvoie vers la destination
 * demandée avant la connexion.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const suite = searchParams.get('suite') ?? '/'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?erreur=lien_invalide`)
  }

  const supabase = createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/login?erreur=lien_expire`)
  }

  // `suite` vient de l'URL : on n'autorise qu'un chemin interne.
  const destination = suite.startsWith('/') && !suite.startsWith('//') ? suite : '/'
  return NextResponse.redirect(`${origin}${destination}`)
}
