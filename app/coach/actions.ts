'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { loadState } from '@/lib/db/queries'
import { TOOL_SCHEMAS, type ToolName } from '@/lib/coach/tools'
import { todayISO, weekday } from '@/lib/engine/date'
import { KIND_OF, rotatePostpone } from '@/lib/engine/program'
import type { SessionLog } from '@/lib/engine/types'
import { createClient } from '@/lib/supabase/server'

export interface CoachResult {
  ok: boolean
  message?: string
}

/** Historique de conversation, conservé pour retrouver le fil d'une séance à l'autre. */
export async function saveCoachMessage(
  role: 'user' | 'assistant',
  content: string,
): Promise<CoachResult> {
  const parsed = z
    .object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(4000) })
    .safeParse({ role, content })
  if (!parsed.success) return { ok: false, message: 'Message invalide.' }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Session expirée.' }

  const { error } = await supabase
    .from('coach_messages')
    .insert({ user_id: user.id, role: parsed.data.role, content: parsed.data.content })
  if (error) return { ok: false, message: error.message }

  return { ok: true }
}

/**
 * Applique une proposition du coach — uniquement après confirmation explicite
 * de l'athlète. L'entrée est revalidée ici : la validation faite à l'affichage
 * ne suffit pas, le client pourrait envoyer autre chose.
 */
export async function applyProposal(name: string, input: unknown): Promise<CoachResult> {
  if (!(name in TOOL_SCHEMAS)) return { ok: false, message: 'Action inconnue.' }
  const schema = TOOL_SCHEMAS[name as ToolName]
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Action invalide.' }
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Session expirée.' }

  const state = await loadState(user.id)
  if (!state) return { ok: false, message: 'Données introuvables.' }

  const done = (): CoachResult => {
    revalidatePath('/')
    revalidatePath('/semaine')
    revalidatePath('/coach')
    return { ok: true }
  }

  switch (name as ToolName) {
    case 'adjust_session': {
      const data = parsed.data as z.infer<typeof TOOL_SCHEMAS.adjust_session>
      const session = state.sessions.find((s) => s.id === data.session_id)
      if (!session) return { ok: false, message: 'Séance introuvable.' }
      if (session.status === 'done') {
        return { ok: false, message: 'Cette séance est déjà validée : elle ne se modifie plus.' }
      }

      const patch: Record<string, unknown> = { edited: true }
      if (data.duration !== undefined) patch.duration = data.duration
      if (data.target !== undefined) patch.target = data.target
      if (data.goal !== undefined) patch.goal = data.goal

      const { error } = await supabase
        .from('sessions')
        .update(patch)
        .eq('id', data.session_id)
        .eq('user_id', user.id)
      if (error) return { ok: false, message: error.message }
      return done()
    }

    case 'postpone_session': {
      const data = parsed.data as z.infer<typeof TOOL_SCHEMAS.postpone_session>
      const before = state.sessions
      const after = rotatePostpone(before, data.session_id)
      const moved = after.filter((s) => before.find((o) => o.id === s.id)?.date !== s.date)
      if (moved.length === 0) return { ok: false, message: 'Cette séance ne peut pas être reportée.' }

      for (const s of moved) {
        const { error } = await supabase
          .from('sessions')
          .update({ date: s.date, moved: true })
          .eq('id', s.id)
          .eq('user_id', user.id)
        if (error) return { ok: false, message: error.message }
      }
      return done()
    }

    case 'log_session': {
      const data = parsed.data as z.infer<typeof TOOL_SCHEMAS.log_session>
      const kind = KIND_OF[data.type]
      const log: SessionLog = {
        source: 'manual',
        minutes: data.minutes,
        km: data.km ?? null,
        distance: data.distance_m ?? null,
        continuous: data.continu_m ?? null,
        reps: data.repetitions ?? null,
      }

      // Une séance déclarée au coach est hors programme : elle est marquée
      // comme telle plutôt que rattachée de force à une séance prévue.
      const { error } = await supabase.from('sessions').insert({
        user_id: user.id,
        date: data.date,
        type: data.type,
        kind,
        status: 'done',
        week: state.sessions.find((s) => s.date === data.date)?.week ?? 1,
        title: `${data.type === 'SWIM' ? 'Piscine' : 'Séance'} hors programme`,
        cues: [],
        duration: data.minutes,
        intensity: Math.min(5, Math.max(1, Math.round(data.rpe / 2))),
        exercises: [],
        log,
        rpe: data.rpe,
        unplanned: true,
        source: 'manual',
      })
      if (error) return { ok: false, message: error.message }
      return done()
    }

    case 'set_benchmark': {
      const data = parsed.data as z.infer<typeof TOOL_SCHEMAS.set_benchmark>
      const { error } = await supabase.from('benchmarks').insert({
        user_id: user.id,
        key: data.key,
        value: data.value,
        unit: data.key === 'swim_continuous' ? 'm' : 'reps',
        partial: data.partiel,
        note: 'Déclaré au coach',
        tested_at: todayISO(),
      })
      if (error) return { ok: false, message: error.message }
      return done()
    }
  }
}

/** Utilisé par l'écran pour situer une séance proposée dans la semaine. */
export async function sessionLabel(sessionId: string): Promise<string | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('sessions')
    .select('date, title')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!data) return null
  return `${data.title} — ${['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'][weekday(data.date)]}`
}
