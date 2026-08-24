'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { loadState } from '@/lib/db/queries'
import { todayISO } from '@/lib/engine/date'
import { rotatePostpone } from '@/lib/engine/program'
import { moveToDate, REFUS } from '@/lib/engine/reorder'
import { createClient } from '@/lib/supabase/server'
import { pastSessionSchema } from '@/lib/validation/session'

export interface ActionResult {
  ok: boolean
  message?: string
}

const idSchema = z.string().uuid()

/** Type de séance porté par une entrée hors programme, par discipline. */
const TYPE_PAR_DISCIPLINE = { run: 'RUN', swim: 'SWIM', strength: 'UPPER' } as const

async function requireUser() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

/**
 * Marque une séance comme réalisée, sans ses détails.
 *
 * Elle compte alors pour l'assiduité, mais pas pour la charge ni pour le
 * score : sans durée ni RPE, il n'y a rien à mesurer. L'écran le dit, et
 * propose d'ajouter les chiffres.
 */
export async function markDone(sessionId: string): Promise<ActionResult> {
  const parsed = idSchema.safeParse(sessionId)
  if (!parsed.success) return { ok: false, message: 'Séance inconnue.' }

  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, message: 'Session expirée.' }

  const { error } = await supabase
    .from('sessions')
    .update({ status: 'done' })
    .eq('id', parsed.data)
    .eq('user_id', user.id)
  if (error) return { ok: false, message: error.message }

  revalidatePath('/semaine')
  revalidatePath('/')
  return { ok: true }
}

export async function skipSession(sessionId: string): Promise<ActionResult> {
  const parsed = idSchema.safeParse(sessionId)
  if (!parsed.success) return { ok: false, message: 'Séance inconnue.' }

  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, message: 'Session expirée.' }

  const { error } = await supabase
    .from('sessions')
    .update({ status: 'skipped' })
    .eq('id', parsed.data)
    .eq('user_id', user.id)
  if (error) return { ok: false, message: error.message }

  revalidatePath('/semaine')
  revalidatePath('/')
  return { ok: true }
}

/**
 * Reporte une séance au lendemain.
 * Si le lendemain est occupé, les deux jours sont échangés — le jour de repos
 * se déplace donc avec la séance, au lieu de disparaître.
 */
export async function postponeSession(sessionId: string): Promise<ActionResult> {
  const parsed = idSchema.safeParse(sessionId)
  if (!parsed.success) return { ok: false, message: 'Séance inconnue.' }

  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, message: 'Session expirée.' }

  const state = await loadState(user.id)
  if (!state) return { ok: false, message: 'Données introuvables.' }

  const before = state.sessions
  const after = rotatePostpone(before, parsed.data)
  const moved = after.filter((s) => {
    const original = before.find((o) => o.id === s.id)
    return original && original.date !== s.date
  })

  if (moved.length === 0) return { ok: false, message: 'Cette séance ne peut pas être reportée.' }

  for (const s of moved) {
    const { error } = await supabase
      .from('sessions')
      .update({ date: s.date, moved: true })
      .eq('id', s.id)
      .eq('user_id', user.id)
    if (error) return { ok: false, message: error.message }
  }

  revalidatePath('/semaine')
  revalidatePath('/')
  return { ok: true }
}

/** Annule un saut ou un « fait » posé par erreur. */
export async function replanSession(sessionId: string): Promise<ActionResult> {
  const parsed = idSchema.safeParse(sessionId)
  if (!parsed.success) return { ok: false, message: 'Séance inconnue.' }

  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, message: 'Session expirée.' }

  const state = await loadState(user.id)
  const session = state?.sessions.find((s) => s.id === parsed.data)
  if (!session) return { ok: false, message: 'Séance introuvable.' }

  // Une séance détaillée ne se remet pas en « prévue » : ses chiffres nourrissent
  // déjà la charge, les records et les repères.
  if (session.log) {
    return {
      ok: false,
      message: "Cette séance a été enregistrée avec ses détails. Modifie-la plutôt que de la reprogrammer.",
    }
  }

  const { error } = await supabase
    .from('sessions')
    .update({ status: 'planned' })
    .eq('id', parsed.data)
    .eq('user_id', user.id)
  if (error) return { ok: false, message: error.message }

  revalidatePath('/semaine')
  revalidatePath('/')
  return { ok: true }
}

/**
 * Déplace une séance sur un autre jour, par glisser-déposer.
 *
 * La règle de refus vit dans `moveToDate`, testée à part : une séance déjà
 * réalisée ne change pas de date, et le repos suit le mouvement au lieu de
 * disparaître de la semaine.
 */
export async function moveSessionToDate(
  sessionId: string,
  date: string,
): Promise<ActionResult> {
  const parsed = z
    .object({ id: idSchema, date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })
    .safeParse({ id: sessionId, date })
  if (!parsed.success) return { ok: false, message: 'Déplacement invalide.' }

  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, message: 'Session expirée.' }

  const state = await loadState(user.id)
  if (!state) return { ok: false, message: 'Données introuvables.' }

  const resultat = moveToDate(state.sessions, parsed.data.id, parsed.data.date)
  if (!resultat.ok) return { ok: false, message: REFUS[resultat.raison] }

  for (const c of resultat.changees) {
    const { error } = await supabase
      .from('sessions')
      .update({ date: c.date, moved: true })
      .eq('id', c.id)
      .eq('user_id', user.id)
    if (error) return { ok: false, message: error.message }
  }

  revalidatePath('/semaine')
  revalidatePath('/')
  return {
    ok: true,
    message: resultat.reposEchange ? 'Le jour de repos a suivi.' : undefined,
  }
}

/**
 * Ajoute une séance déjà faite, à une date passée.
 *
 * Elle est marquée hors programme et saisie à la main : elle compte dans la
 * charge et le volume, mais rien n'y est deviné. Sans RPE, sa charge repose
 * sur une estimation, et les graphiques le montrent.
 */
export async function addPastSession(input: unknown): Promise<ActionResult> {
  const parsed = pastSessionSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Séance invalide.' }
  }

  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, message: 'Session expirée.' }

  const s = parsed.data
  if (s.date > todayISO()) {
    return {
      ok: false,
      message: "Cette date est dans le futur. Une séance à venir se planifie, elle ne se déclare pas faite.",
    }
  }

  const log =
    s.kind === 'run'
      ? { km: s.distance, minutes: s.minutes, hr: null, elev: null }
      : s.kind === 'swim'
        ? // Le repère « en continu » ne se saisit qu'au moment d'un test.
          { minutes: s.minutes, distance: s.distance, continuous: null, pauses: null, stroke: null, crawl: null }
        : {
            minutes: s.minutes,
            // Totaux pour la charge et les graphiques, détail pour savoir ce
            // qui a réellement travaillé.
            reps: s.exercises.reduce((a, e) => a + (e.unit === 'reps' ? e.sets * e.reps : 0), 0),
            sets: s.exercises.reduce((a, e) => a + e.sets, 0),
            exercises: s.exercises,
          }

  const { error } = await supabase.from('sessions').insert({
    user_id: user.id,
    date: s.date,
    type: TYPE_PAR_DISCIPLINE[s.kind],
    kind: s.kind,
    status: 'done',
    week: 0,
    title: s.title,
    duration: Math.round(s.minutes),
    intensity: 0,
    unplanned: true,
    source: 'manual',
    log,
    rpe: s.rpe,
    note: s.note,
  })
  if (error) return { ok: false, message: error.message }

  revalidatePath('/semaine')
  revalidatePath('/')
  revalidatePath('/perfs')
  return { ok: true }
}
