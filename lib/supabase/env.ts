/**
 * Sans projet Supabase configuré, l'app ne peut ni authentifier ni lire.
 * Plutôt qu'un écran blanc et une erreur de cookie illisible, on détecte
 * l'absence de configuration et on l'affiche telle quelle.
 */
export function hasSupabaseEnv(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('http') &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
