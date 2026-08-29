'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { sessionToRow } from '@/lib/db/mappers'
import { todayISO } from '@/lib/engine/date'
import { baseWeeklyKm, generatePlan } from '@/lib/engine/program'
import type { BenchmarkKey } from '@/lib/engine/types'
import { createClient } from '@/lib/supabase/server'
import {
  onboardingSchema,
  restWeekdayFrom,
  type BenchmarkClaim,
  type OnboardingInput,
} from '@/lib/validation/onboarding'

/** Nombre de semaines générées d'avance. Le reste se génère au fil de l'eau. */
const PLAN_WEEKS = 8

export interface OnboardingResult {
  ok: boolean
  message?: string
}

interface BenchmarkRow {
  user_id: string
  key: BenchmarkKey
  value: number
  unit: string
  partial: boolean
  note: string
  tested_at: string
}

/**
 * Un repère déclaré n'est pas un repère testé.
 * « Au moins X » devient un repère partiel, « mon max est X » un repère plein,
 * et « je ne sais pas » ne crée aucune ligne : il restera « À TESTER ».
 */
function claimToRow(
  claim: BenchmarkClaim,
  key: BenchmarkKey,
  userId: string,
  today: string,
  unit = 'reps',
): BenchmarkRow | null {
  if (claim.mode === 'untested') return null
  return {
    user_id: userId,
    key,
    value: claim.value,
    unit,
    partial: claim.mode === 'atleast',
    note:
      claim.mode === 'atleast'
        ? "Déclaré à l'inscription — minimum connu, maximum non testé"
        : "Déclaré à l'inscription",
    tested_at: today,
  }
}

export async function completeOnboarding(input: OnboardingInput): Promise<OnboardingResult> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: false, message: 'Session expirée. Reconnecte-toi.' }

  const parsed = onboardingSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Réponses incomplètes.' }
  }

  const { profil, sports, objectifs, disponibilites, limitations, running, swimming, force } =
    parsed.data
  const today = todayISO()

  /*
   * Le generateur actuel cale tout le microcycle sur un jour de repos unique.
   * On le deduit des jours retenus plutot que de poser une seconde question :
   * l'athlete dit quand il peut s'entrainer, le reste suit.
   */
  const restWeekday = restWeekdayFrom(disponibilites.availableWeekdays)

  /*
   * L'echelle du programme est ancree sur le volume actuel. Sans course
   * declaree, il n'y a pas de volume a ancrer et la colonne reste nulle.
   */
  const baseKm = running ? baseWeeklyKm(running.weeklyKm) : null

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: user.id,
    name: profil.name,
    sex: profil.sex,
    birth_date: profil.birthDate,
    level: profil.level,
    height_cm: profil.heightCm,
    start_weight: profil.currentKg,
    goal_weight: profil.goalKg,
    program_start: today,
    // `race_date` reste alimentee par l'echeance de l'objectif principal :
    // le generateur marathon la lit encore. La table `goals` en est desormais
    // la source, cette colonne n'en est qu'un reflet.
    race_date: objectifs.principal.date,
    rest_weekday: restWeekday,
    allow_doubles: disponibilites.allowDoubles,
    base_weekly_km: baseKm,
    sports,
    available_weekdays: disponibilites.availableWeekdays,
    equipment: force?.equipment ?? [],
    session_minutes: disponibilites.sessionMinutes,
    onboarded_at: new Date().toISOString(),
  })
  if (profileError) return { ok: false, message: profileError.message }

  /*
   * Objectifs : on remplace les precedents plutot que d'empiler. Un index
   * unique interdit deux principaux actifs, donc reinscrire sans effacer
   * echouerait sur un second passage.
   */
  const { error: goalsCleanup } = await supabase.from('goals').delete().eq('user_id', user.id)
  if (goalsCleanup) return { ok: false, message: goalsCleanup.message }

  const goalRows = [
    { user_id: user.id, type: objectifs.principal.type, priority: 'principal' as const, target_date: objectifs.principal.date, status: 'actif' as const },
    ...(objectifs.secondaire
      ? [{ user_id: user.id, type: objectifs.secondaire.type, priority: 'secondaire' as const, target_date: objectifs.secondaire.date, status: 'actif' as const }]
      : []),
  ]
  const { error: goalsError } = await supabase.from('goals').insert(goalRows)
  if (goalsError) return { ok: false, message: goalsError.message }

  /*
   * Limitations : meme logique de remplacement. Une blessure guerie ne doit
   * pas survivre a un nouvel onboarding ou l'athlete ne la mentionne plus.
   */
  const { error: limCleanup } = await supabase.from('limitations').delete().eq('user_id', user.id)
  if (limCleanup) return { ok: false, message: limCleanup.message }

  if (limitations.length > 0) {
    const { error } = await supabase.from('limitations').insert(
      limitations.map((l) => ({
        user_id: user.id,
        zone: l.zone,
        description: l.description || null,
        started_on: today,
      })),
    )
    if (error) return { ok: false, message: error.message }
  }

  const { error: weightError } = await supabase
    .from('weights')
    .upsert({ user_id: user.id, date: today, kg: profil.currentKg }, { onConflict: 'user_id,date' })
  if (weightError) return { ok: false, message: weightError.message }

  /*
   * Un second onboarding ne doit pas empiler des reperes declares par-dessus
   * les precedents : on efface ceux qui venaient d'une declaration, jamais
   * ceux issus d'un test reellement passe en seance.
   */
  const { error: benchCleanup } = await supabase
    .from('benchmarks')
    .delete()
    .eq('user_id', user.id)
    .like('note', 'Déclaré à l%')
  if (benchCleanup) return { ok: false, message: benchCleanup.message }

  const benchmarkRows = [
    force ? claimToRow(force.pullups, 'pullups', user.id, today) : null,
    force ? claimToRow(force.dips, 'dips', user.id, today) : null,
    force ? claimToRow(force.muscleups, 'muscleups', user.id, today) : null,
    force ? claimToRow(force.legraises, 'legraises', user.id, today) : null,
    swimming && swimming.continuousM > 0
      ? {
          user_id: user.id,
          key: 'swim_continuous' as const,
          value: swimming.continuousM,
          unit: 'm',
          partial: true,
          note: "Déclaré à l'inscription — à confirmer en séance",
          tested_at: today,
        }
      : null,
  ].filter((r): r is BenchmarkRow => r !== null)

  if (benchmarkRows.length > 0) {
    const { error } = await supabase.from('benchmarks').insert(benchmarkRows)
    if (error) return { ok: false, message: error.message }
  }

  // Un nouvel onboarding remplace le programme à venir, jamais l'historique.
  const { error: cleanupError } = await supabase
    .from('sessions')
    .delete()
    .eq('user_id', user.id)
    .eq('status', 'planned')
    .gte('date', today)
  if (cleanupError) return { ok: false, message: cleanupError.message }

  /*
   * Le generateur ne sait encore produire qu'un microcycle course / natation /
   * force. Les sports declares et les jours disponibles sont enregistres mais
   * ne l'influencent pas encore : c'est le planificateur multi-sport, etape
   * suivante du plan, qui s'en servira.
   */
  const plan = generatePlan(today, PLAN_WEEKS, 1, {
    restWeekday,
    allowDoubles: disponibilites.allowDoubles,
    raceDate: objectifs.principal.date,
    ...(baseKm !== null ? { baseKm } : {}),
  })

  const { error: planError } = await supabase
    .from('sessions')
    .insert(plan.map((s) => sessionToRow(s, user.id)))
  if (planError) return { ok: false, message: planError.message }

  revalidatePath('/aujourdhui')
  redirect('/aujourdhui')
}
