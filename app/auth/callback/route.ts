import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

/**
 * Retour d'un lien magique ou d'une connexion OAuth.
 *
 * Deux formes de lien arrivent ici, et il faut les deux :
 *
 * - `?code=` — flux PKCE. Le plus sûr, mais il exige le cookie `code_verifier`
 *   déposé par le navigateur qui a demandé le lien. Demander depuis un
 *   appareil et ouvrir le mail depuis un autre échoue donc toujours. Sur iOS,
 *   une app installée sur l'écran d'accueil a même un stockage distinct de
 *   Safari : le simple fait d'ouvrir le mail hors de l'app suffit à casser
 *   l'échange.
 *
 * - `?token_hash=&type=` — vérification d'OTP. Sans secret côté navigateur,
 *   donc valable depuis n'importe quel appareil. C'est la forme à privilégier
 *   pour un lien reçu par mail ; elle suppose que le gabarit d'e-mail Supabase
 *   utilise `{{ .TokenHash }}`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const suite = searchParams.get('suite') ?? '/'

  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  if (!code && !tokenHash) {
    return NextResponse.redirect(`${origin}/login?erreur=lien_invalide`)
  }

  const supabase = createClient()

  const { error } = tokenHash
    ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type ?? 'email' })
    : await supabase.auth.exchangeCodeForSession(code as string)

  if (error) {
    /*
     * Un échange PKCE raté vient bien plus souvent d'un changement de
     * navigateur que d'un lien réellement périmé. On le dit, plutôt que
     * d'envoyer l'athlète redemander un lien qui échouera pareil.
     */
    const motif = code ? 'lien_autre_navigateur' : 'lien_expire'
    return NextResponse.redirect(`${origin}/login?erreur=${motif}`)
  }

  // `suite` vient de l'URL : on n'autorise qu'un chemin interne.
  const destination = suite.startsWith('/') && !suite.startsWith('//') ? suite : '/'
  return NextResponse.redirect(`${origin}${destination}`)
}
