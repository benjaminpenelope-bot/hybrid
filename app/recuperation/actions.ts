'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { todayISO } from '@/lib/engine/date'
import { createClient } from '@/lib/supabase/server'

export interface SaveResult {
  ok: boolean
  message?: string
}

const wellnessSchema = z.object({
  sleep: z.number().min(0).max(24).nullable(),
  fatigue: z.number().int().min(1).max(10).nullable(),
  motivation: z.number().int().min(1).max(10).nullable(),
  soreness: z.string().trim().max(300).nullable(),
  restingHr: z.number().int().min(25).max(150).nullable(),
})

export type WellnessInput = z.infer<typeof wellnessSchema>

/**
 * Relevé du jour. Chaque champ peut rester vide : une case non remplie reste
 * `null` et sort du score, au lieu de compter comme un zéro.
 */
export async function saveWellness(input: WellnessInput): Promise<SaveResult> {
  const parsed = wellnessSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Relevé invalide.' }
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Session expirée.' }

  const { error } = await supabase.from('wellness').upsert(
    {
      user_id: user.id,
      date: todayISO(),
      sleep: parsed.data.sleep,
      fatigue: parsed.data.fatigue,
      motivation: parsed.data.motivation,
      soreness: parsed.data.soreness,
      resting_hr: parsed.data.restingHr,
    },
    { onConflict: 'user_id,date' },
  )
  if (error) return { ok: false, message: error.message }

  revalidatePath('/recuperation')
  revalidatePath('/')
  return { ok: true }
}
