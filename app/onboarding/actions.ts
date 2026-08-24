'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { sessionToRow } from '@/lib/db/mappers'
import { todayISO } from '@/lib/engine/date'
import { baseWeeklyKm, generatePlan } from '@/lib/engine/program'
import type { BenchmarkKey } from '@/lib/engine/types'
import { createClient } from '@/lib/supabase/server'
import { onboardingSchema, type BenchmarkClaim, type OnboardingInput } from '@/lib/validation/onboarding'

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

  const { running, swimming, street, body, availability } = parsed.data
  const today = todayISO()
  // L'échelle du programme est ancrée sur le volume actuel de l'athlète.
  const baseKm = baseWeeklyKm(running.weeklyKm)

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: user.id,
    name: body.name,
    height_cm: body.heightCm,
    start_weight: body.currentKg,
    goal_weight: body.goalKg,
    program_start: today,
    race_date: availability.raceDate,
    rest_weekday: availability.restWeekday,
    allow_doubles: availability.allowDoubles,
    base_weekly_km: baseKm,
    equipment: street.equipment,
    session_minutes: availability.sessionMinutes,
    onboarded_at: new Date().toISOString(),
  })
  if (profileError) return { ok: false, message: profileError.message }

  const { error: weightError } = await supabase
    .from('weights')
    .upsert({ user_id: user.id, date: today, kg: body.currentKg }, { onConflict: 'user_id,date' })
  if (weightError) return { ok: false, message: weightError.message }

  const benchmarkRows = [
    claimToRow(street.pullups, 'pullups', user.id, today),
    claimToRow(street.dips, 'dips', user.id, today),
    claimToRow(street.muscleups, 'muscleups', user.id, today),
    claimToRow(street.legraises, 'legraises', user.id, today),
    swimming.continuousM > 0
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

  const plan = generatePlan(today, PLAN_WEEKS, 1, {
    restWeekday: availability.restWeekday,
    allowDoubles: availability.allowDoubles,
    raceDate: availability.raceDate,
    baseKm,
  })

  const { error: planError } = await supabase
    .from('sessions')
    .insert(plan.map((s) => sessionToRow(s, user.id)))
  if (planError) return { ok: false, message: planError.message }

  revalidatePath('/')
  redirect('/')
}
