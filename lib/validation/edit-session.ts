import { z } from 'zod'

/**
 * Édition d'une séance. Ne touche qu'une journée : ni le programme des
 * semaines suivantes, ni le microcycle du profil.
 */

export const exerciseSchema = z.object({
  n: z.string().trim().min(1, 'Un exercice a besoin d’un nom.').max(120),
  sets: z.number().int().min(1).max(20),
  reps: z.string().trim().min(1).max(60),
  /** Repos en secondes. */
  rest: z.number().int().min(0).max(900),
  /** Répétitions en réserve visées. */
  rir: z.number().int().min(0).max(5),
  cue: z.string().trim().max(400),
  unit: z.string().trim().max(8).optional(),
  test: z
    .enum(['pullups', 'dips', 'muscleups', 'legraises', 'squats', 'pushups'])
    .optional(),
})

export const editSessionSchema = z.object({
  sessionId: z.string().uuid(),
  type: z.enum(['RUN', 'LONG', 'SWIM', 'BIKE', 'RIDE', 'UPPER', 'LOWER', 'REST']),
  title: z.string().trim().min(1, 'La séance a besoin d’un titre.').max(120),
  goal: z.string().trim().max(600).nullable(),
  why: z.string().trim().max(900).nullable(),
  target: z.string().trim().max(600).nullable(),
  duration: z.number().int().min(0).max(600),
  intensity: z.number().int().min(0).max(5),
  cues: z.array(z.string().trim().max(240)).max(8),
  exercises: z.array(exerciseSchema).max(20),
})

export type EditSessionInput = z.infer<typeof editSessionSchema>
export type EditableExercise = z.infer<typeof exerciseSchema>
