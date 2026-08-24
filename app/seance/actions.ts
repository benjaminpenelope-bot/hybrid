'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { loadState } from '@/lib/db/queries'
import { sessionToRow } from '@/lib/db/mappers'
import { adapt } from '@/lib/engine/adapt'
import { todayISO } from '@/lib/engine/date'
import { sum } from '@/lib/engine/math'
import { KIND_OF } from '@/lib/engine/program'
import { detectPRs, toRecords } from '@/lib/engine/prs'
import { benchmarkValue } from '@/lib/engine/state'
import type { SessionLog, TestResult } from '@/lib/engine/types'
import { createClient } from '@/lib/supabase/server'
import { editSessionSchema, type EditSessionInput } from '@/lib/validation/edit-session'
import { finishSessionSchema, type FinishSessionInput } from '@/lib/validation/session'

export interface FinishResult {
  ok: boolean
  message?: string
}

/**
 * Validation d'une séance.
 *
 * Ordre volontaire : on écrit d'abord la séance, puis on en tire les
 * conséquences — records, repères, relevé du jour, adaptation des séances
 * suivantes. Chaque écriture dérive d'une donnée saisie, aucune n'est déduite
 * d'une moyenne.
 */
export async function finishSession(input: FinishSessionInput): Promise<FinishResult> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Session expirée. Reconnecte-toi.' }

  const parsed = finishSessionSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Saisie incomplète.' }
  }
  const data = parsed.data

  const state = await loadState(user.id)
  const session = state?.sessions.find((s) => s.id === data.sessionId)
  if (!state || !session) return { ok: false, message: 'Séance introuvable.' }

  const today = todayISO()

  /* ── Le log, construit depuis la seule discipline concernée ── */
  let log: SessionLog = { source: 'manual' }
  const tests: TestResult[] = []

  if (data.run) {
    log = {
      ...log,
      km: data.run.km,
      minutes: data.run.minutes,
      hr: data.run.hr ?? null,
      elev: data.run.elev ?? null,
      note: data.run.finisherDone === false ? 'Bloc jambes non effectué' : null,
    }
  } else if (data.swim) {
    log = {
      ...log,
      minutes: data.swim.minutes,
      distance: data.swim.distance ?? null,
      continuous: data.swim.continuous,
      pauses: data.swim.pauses ?? null,
      stroke: data.swim.stroke,
      crawl: data.swim.crawl ?? false,
    }
  } else if (data.strength) {
    const sets = data.strength.sets
    log = {
      ...log,
      minutes: data.strength.minutes,
      reps: sum(sets.map((s) => s.reps)),
      sets: sets.length,
    }
    // Une série de test devient un repère : c'est la seule façon d'en obtenir un.
    for (const s of sets) {
      if (s.test && s.reps > 0) {
        tests.push({ key: s.test, name: s.name.replace(/^TEST — /, '').toLowerCase(), value: s.reps })
      }
    }
    log.tests = tests
  }

  const prs = detectPRs(state, session, log)

  /* ── Écriture de la séance ── */
  const { error: sessionError } = await supabase
    .from('sessions')
    .update({
      status: 'done',
      log,
      rpe: data.rpe,
      note: data.note,
      pain: data.pain,
    })
    .eq('id', session.id)
    .eq('user_id', user.id)
  if (sessionError) return { ok: false, message: sessionError.message }

  /* ── Relevé du jour : le RPE et la fatigue viennent d'être saisis ── */
  const { error: wellnessError } = await supabase.from('wellness').upsert(
    {
      user_id: user.id,
      date: today,
      sleep: data.sleep,
      fatigue: data.fatigue,
      soreness: data.pain,
    },
    { onConflict: 'user_id,date' },
  )
  if (wellnessError) return { ok: false, message: wellnessError.message }

  /* ── Repères testés ── */
  if (tests.length > 0) {
    const rows = tests.map((t) => ({
      user_id: user.id,
      key: t.key,
      value: t.value,
      unit: 'reps',
      partial: false,
      note: 'Testé en séance',
      tested_at: today,
    }))
    const { error } = await supabase.from('benchmarks').insert(rows)
    if (error) return { ok: false, message: error.message }
  }

  /* ── Records ── */
  if (prs.length > 0) {
    const { error } = await supabase
      .from('records')
      .insert(toRecords(prs, today).map((r) => ({ ...r, user_id: user.id })))
    if (error) return { ok: false, message: error.message }
  }

  /* ── Adaptation des séances suivantes ── */
  const done = { ...session, status: 'done' as const, log, rpe: data.rpe, pain: data.pain }
  const result = adapt(
    state.sessions.map((s) => (s.id === session.id ? done : s)),
    {
      date: session.date,
      sessionId: session.id,
      rpe: data.rpe,
      fatigue: data.fatigue,
      pain: data.pain,
    },
  )

  for (const id of result.changed) {
    const updated = result.sessions.find((s) => s.id === id)
    if (!updated) continue
    const row = sessionToRow(updated, user.id)
    const { error } = await supabase
      .from('sessions')
      .update({
        duration: row.duration,
        goal: row.goal,
        adapted: row.adapted,
        volume_factor: row.volume_factor,
      })
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) return { ok: false, message: error.message }
  }

  revalidatePath('/')
  redirect(`/seance/${session.id}/resume`)
}

/** Repère courant d'une clé, pour afficher la cible pendant un test. */
export async function currentBenchmark(userId: string, key: string): Promise<number | null> {
  const state = await loadState(userId)
  if (!state) return null
  return benchmarkValue(state.benchmarks[key as keyof typeof state.benchmarks])
}

/**
 * Enregistre une séance modifiée à la main.
 *
 * L'édition ne concerne que la journée choisie : le programme des semaines
 * suivantes reste tel quel, et le microcycle du profil n'est pas touché.
 */
export async function updateSession(input: EditSessionInput): Promise<FinishResult> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Session expirée. Reconnecte-toi.' }

  const parsed = editSessionSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Séance incomplète.' }
  }
  const data = parsed.data

  const { error } = await supabase
    .from('sessions')
    .update({
      type: data.type,
      kind: KIND_OF[data.type],
      title: data.title,
      goal: data.goal,
      why: data.why,
      target: data.target,
      duration: data.duration,
      intensity: data.intensity,
      cues: data.cues,
      exercises: data.exercises,
      edited: true,
    })
    .eq('id', data.sessionId)
    .eq('user_id', user.id)
  if (error) return { ok: false, message: error.message }

  revalidatePath('/')
  revalidatePath('/semaine')
  redirect('/semaine')
}
