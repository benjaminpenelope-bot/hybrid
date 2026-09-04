import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { hasSupabaseEnv } from '@/lib/supabase/env'

/**
 * Rafraîchit la session à chaque requête et garde les routes privées.
 * Sans ce passage, un token expiré ne serait renouvelé qu'au prochain
 * appel client, et un Server Component verrait un utilisateur déconnecté.
 */

// Les routes d'API portent leur propre contrôle d'accès et répondent en JSON :
// les rediriger vers /login renverrait du HTML à un client qui attend des données.
// L'écran hors ligne doit rester atteignable sans session : c'est justement ce
// que le service worker sert quand plus rien ne répond.
const PUBLIC_ROUTES = ['/', '/login', '/auth', '/api', '/hors-ligne']

export async function middleware(request: NextRequest) {
  // Sans projet branché, l'app affiche l'écran de configuration : rien à garder.
  if (!hasSupabaseEnv()) return NextResponse.next({ request })

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  /*
   * Apercu de travail du questionnaire, borne au developpement : il se rend
   * sans session, sinon relire un ecran demanderait de creer un compte. En
   * production la condition est fausse quoi qu'on mette dans l'adresse, donc
   * la porte n'existe pas — la page applique la meme borne de son cote.
   */
  const apercuOnboarding =
    process.env.NODE_ENV === 'development' &&
    pathname === '/onboarding' &&
    request.nextUrl.searchParams.get('apercu') === '1'

  const isPublic =
    apercuOnboarding || PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('suite', pathname)
    return NextResponse.redirect(url)
  }

  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/aujourdhui'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Toutes les routes sauf les fichiers statiques et les images.
     * Le webhook Strava est exclu : il est appelé par Strava, sans session.
     * Le service worker, le manifeste et les icônes sont demandés par le
     * navigateur ou le système, parfois sans cookie : les rediriger vers
     * /login casserait l'installation de l'app.
     *
     * Les vidéos, les polices et le raccourci iOS sont exclus pour la même
     * raison que les images : ils sont récupérés par une balise ou un
     * téléchargement, pas par une navigation — et un fichier de raccourci qui
     * recevrait une page de connexion en HTML échouerait à l'import sans dire
     * pourquoi.
     * Sans elles dans cette liste, une vidéo de la page d'accueil recevait
     * une redirection HTML vers /login à la place de ses octets.
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icon|apple-icon|api/strava/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|webm|woff2?|shortcut)$).*)',
  ],
}
