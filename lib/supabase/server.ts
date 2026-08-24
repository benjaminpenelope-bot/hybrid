import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Client Supabase côté serveur : Server Components, Server Actions,
 * Route Handlers. La RLS s'applique, l'utilisateur ne voit que ses lignes.
 */
export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Appelé depuis un Server Component : le middleware a déjà
            // rafraîchi la session, il n'y a rien à réécrire ici.
          }
        },
      },
    },
  )
}

/** Identifiant de l'utilisateur connecté, ou null. */
export async function currentUserId(): Promise<string | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}
