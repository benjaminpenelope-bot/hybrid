import { createClient } from '@supabase/supabase-js'

/**
 * Client à clé service : contourne la RLS.
 * Réservé aux traitements serveur qui n'ont pas de session utilisateur —
 * webhook Strava, imports. Ne jamais l'importer depuis un composant client.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY manquante')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false },
  })
}
