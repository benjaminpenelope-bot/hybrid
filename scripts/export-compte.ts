/**
 * Export — écrit tout ce que la base contient sur un compte, dans un JSON.
 *
 *   npm run export -- athlete@exemple.fr
 *
 * Deux usages :
 *
 * 1. Filet avant une migration. Une migration additive n'est pas censée perdre
 *    de données, mais « pas censée » n'est pas une garantie : on compare le
 *    fichier d'avant et l'état d'après.
 * 2. Base de l'export RGPD de l'étape 02. Le format est déjà celui qu'on
 *    remettra à un utilisateur qui réclame ses données.
 *
 * Utilise la clé service, donc à exécuter depuis un poste de confiance. Le
 * fichier produit contient tout l'historique d'entraînement : à traiter comme
 * une donnée personnelle, pas comme un artefact de build.
 */

import { writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.')
  process.exit(1)
}

/**
 * `process.exit` renvoie `never`, donc le retour est bien un `string` : la
 * garde suffit et aucune assertion de type n'est necessaire ici.
 */
function emailArgument(): string {
  const valeur = process.argv[2]
  if (!valeur) {
    console.error('Usage : npm run export -- <email de l utilisateur>')
    process.exit(1)
  }
  return valeur
}

const email = emailArgument()

const db = createClient(url, serviceKey, { auth: { persistSession: false } })

/**
 * Tables portant des données personnelles, et la colonne qui les rattache au
 * compte. `profiles` est la seule dont la clé primaire est l'identifiant.
 */
const TABLES: { nom: string; cle: 'user_id' | 'id' }[] = [
  { nom: 'profiles', cle: 'id' },
  { nom: 'sessions', cle: 'user_id' },
  { nom: 'weights', cle: 'user_id' },
  { nom: 'measurements', cle: 'user_id' },
  { nom: 'photos', cle: 'user_id' },
  { nom: 'wellness', cle: 'user_id' },
  { nom: 'benchmarks', cle: 'user_id' },
  { nom: 'records', cle: 'user_id' },
  { nom: 'coach_messages', cle: 'user_id' },
]

async function findUserId(target: string): Promise<string> {
  const { data, error } = await db.auth.admin.listUsers({ perPage: 200 })
  if (error) throw error
  const user = data.users.find((u) => u.email?.toLowerCase() === target.toLowerCase())
  if (!user) throw new Error(`Aucun utilisateur avec l'email ${target}.`)
  return user.id
}

async function main(): Promise<void> {
  const userId = await findUserId(email)
  const contenu: Record<string, unknown[]> = {}

  for (const { nom, cle } of TABLES) {
    const { data, error } = await db.from(nom).select('*').eq(cle, userId)
    if (error) throw new Error(`${nom} : ${error.message}`)
    contenu[nom] = data ?? []
  }

  /*
   * `integrations` est exclue volontairement : elle ne contient que des jetons
   * chiffrés, inutilisables hors du serveur, et les exporter en clair dans un
   * fichier annulerait le chiffrement au repos.
   */

  const horodatage = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const fichier = `export-${horodatage}.json`

  writeFileSync(
    fichier,
    JSON.stringify({ exporte_le: new Date().toISOString(), email, user_id: userId, ...contenu }, null, 2),
    'utf8',
  )

  console.log(`\nExport écrit dans ${fichier}\n`)
  for (const { nom } of TABLES) {
    console.log(`  ${nom.padEnd(16)} ${String(contenu[nom]!.length).padStart(4)} ligne(s)`)
  }
  console.log('\nCe fichier contient tes données personnelles. Ne le committe pas.')
}

main().catch((e) => {
  console.error('Export impossible :', e instanceof Error ? e.message : e)
  process.exit(1)
})
