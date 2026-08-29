import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * EXPORT ET SUPPRESSION DE COMPTE
 *
 * Deux obligations du RGPD, jusqu'ici absentes : toute personne peut récupérer
 * ses données et faire effacer son compte.
 *
 * L'export passe par le client de session, jamais par la clé service. La RLS
 * garantit alors qu'un export ne peut contenir que les données de celui qui le
 * demande — une garantie de la base, pas une promesse du code applicatif.
 */

/**
 * Tables portant des données personnelles, et la colonne qui les rattache au
 * compte. `profiles` est la seule dont la clé primaire est l'identifiant.
 *
 * `integrations` est absente volontairement : elle ne contient que des jetons
 * chiffrés, inutilisables hors du serveur. Les exporter en clair annulerait le
 * chiffrement au repos. La suppression, elle, l'emporte par cascade.
 */
export const TABLES_PERSONNELLES: { nom: string; cle: 'user_id' | 'id' }[] = [
  { nom: 'profiles', cle: 'id' },
  { nom: 'sessions', cle: 'user_id' },
  { nom: 'weights', cle: 'user_id' },
  { nom: 'measurements', cle: 'user_id' },
  { nom: 'photos', cle: 'user_id' },
  { nom: 'wellness', cle: 'user_id' },
  { nom: 'benchmarks', cle: 'user_id' },
  { nom: 'records', cle: 'user_id' },
  { nom: 'coach_messages', cle: 'user_id' },
  { nom: 'goals', cle: 'user_id' },
  { nom: 'limitations', cle: 'user_id' },
]

export interface ExportCompte {
  exporte_le: string
  user_id: string
  email: string | null
  [table: string]: unknown
}

/** Tout ce que la base contient sur ce compte, tables lisibles comprises. */
export async function exporterCompte(userId: string): Promise<ExportCompte> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const contenu: Record<string, unknown[]> = {}
  for (const { nom, cle } of TABLES_PERSONNELLES) {
    const { data, error } = await supabase.from(nom).select('*').eq(cle, userId)
    if (error) throw new Error(`${nom} : ${error.message}`)
    contenu[nom] = data ?? []
  }

  return {
    exporte_le: new Date().toISOString(),
    user_id: userId,
    email: user?.email ?? null,
    ...contenu,
  }
}

/** Nom du fichier remis à l'athlète. Daté, pour que deux exports ne se confondent pas. */
export function nomFichierExport(date = new Date()): string {
  return `polytrain-export-${date.toISOString().slice(0, 10)}.json`
}

/**
 * Efface le compte et tout ce qui s'y rattache.
 *
 * L'ordre compte. Les photos vivent dans le Storage, que la cascade SQL
 * n'atteint pas : supprimer d'abord l'utilisateur laisserait les fichiers
 * orphelins, sans plus aucune ligne pour dire à qui ils appartenaient — donc
 * sans moyen de les retrouver. On vide donc le Storage tant que les chemins
 * sont encore lisibles, puis on supprime le compte, ce qui emporte les onze
 * tables par cascade depuis `auth.users`.
 */
export async function supprimerCompte(userId: string): Promise<void> {
  const supabase = createClient()

  const { data: photos, error: lecture } = await supabase
    .from('photos')
    .select('storage_path')
    .eq('user_id', userId)
  if (lecture) throw new Error(`Lecture des photos impossible : ${lecture.message}`)

  const chemins = (photos ?? []).map((p: { storage_path: string }) => p.storage_path)
  if (chemins.length > 0) {
    const { error } = await supabase.storage.from('progress-photos').remove(chemins)
    if (error) throw new Error(`Suppression des photos impossible : ${error.message}`)
  }

  /*
   * Seul appel qui exige la cle service : effacer une ligne de `auth.users`
   * n'est pas a la portee d'une session utilisateur. L'identifiant vient de
   * la session appelante, jamais d'un parametre client.
   */
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) throw new Error(`Suppression du compte impossible : ${error.message}`)
}
