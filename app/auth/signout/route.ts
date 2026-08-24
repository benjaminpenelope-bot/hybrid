import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  await supabase.auth.signOut()
  // Le drapeau dit à l'écran de connexion de vider les pages en cache. Une
  // déconnexion volontaire ne doit rien laisser de lisible sur l'appareil.
  return NextResponse.redirect(
    new URL('/login?deconnexion=1', request.nextUrl.origin),
    { status: 303 },
  )
}
