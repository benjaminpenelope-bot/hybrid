/**
 * Seed — recree l'historique réel de référence pour un utilisateur.
 *
 *   npm run seed -- athlete@exemple.fr
 *
 * Utilise la clé service : à exécuter depuis un poste de confiance uniquement.
 * Le script est idempotent : il efface les données de l'utilisateur cible
 * avant de les réécrire.
 */

import { createClient } from '@supabase/supabase-js'
import { sessionToRow } from '../lib/db/mappers'
import { todayISO } from '../lib/engine/date'
import { seedState } from '../lib/seed-data'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.')
  process.exit(1)
}

const email = process.argv[2]
if (!email) {
  console.error('Usage : npm run seed -- <email de l utilisateur>')
  process.exit(1)
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } })

async function findUserId(target: string): Promise<string> {
  const { data, error } = await db.auth.admin.listUsers({ perPage: 200 })
  if (error) throw error
  const user = data.users.find((u) => u.email?.toLowerCase() === target.toLowerCase())
  if (!user) throw new Error(`Aucun utilisateur avec l'email ${target}. Connecté-toi une fois avant de seeder.`)
  return user.id
}

async function main(): Promise<void> {
  const userId = await findUserId(email as string)
  const today = todayISO()
  const state = seedState(today)

  // Table enfant d'abord : tout dépend de profiles.
  for (const table of [
    'sessions',
    'weights',
    'measurements',
    'photos',
    'wellness',
    'benchmarks',
    'records',
    'coach_messages',
  ]) {
    const { error } = await db.from(table).delete().eq('user_id', userId)
    if (error) throw new Error(`${table} : ${error.message}`)
  }

  const { error: profileError } = await db.from('profiles').upsert({
    id: userId,
    name: state.profile.name,
    height_cm: state.profile.heightCm,
    start_weight: state.profile.startWeight,
    goal_weight: state.profile.goalWeight,
    program_start: state.profile.programStart,
    race_date: state.profile.raceDate,
    rest_weekday: state.profile.restWeekday,
    allow_doubles: state.profile.allowDoubles,
    onboarded_at: new Date().toISOString(),
  })
  if (profileError) throw profileError

  const { error: sessionError } = await db
    .from('sessions')
    .insert(state.sessions.map((s) => ({ ...sessionToRow(s, userId), id: undefined })))
  if (sessionError) throw sessionError

  const { error: weightError } = await db
    .from('weights')
    .insert(state.weights.map((w) => ({ user_id: userId, date: w.date, kg: w.kg })))
  if (weightError) throw weightError

  // Un seul repère connu, et il est partiel : 5 x 10 squats faciles,
  // maximum réel jamais testé. Tous les autres restent absents.
  const benchmarks = Object.entries(state.benchmarks)
    .filter(([, b]) => b !== null && b !== undefined)
    .map(([key, b]) => ({
      user_id: userId,
      key,
      value: b!.value,
      partial: b!.partial,
      note: b!.note ?? null,
      tested_at: b!.testedAt,
    }))
  if (benchmarks.length) {
    const { error } = await db.from('benchmarks').insert(benchmarks)
    if (error) throw error
  }

  const done = state.sessions.filter((s) => s.status === 'done').length
  const planned = state.sessions.length - done
  console.log(
    [
      `Utilisateur   ${email} (${userId})`,
      `Séances       ${done} réalisées, ${planned} prévues`,
      `Poids         ${state.weights[0]?.kg} kg`,
      `Repères       ${benchmarks.length} enregistré(s), ${5 - benchmarks.length} à tester`,
    ].join('\n'),
  )
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
