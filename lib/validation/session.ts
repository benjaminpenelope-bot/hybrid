import { z } from 'zod'
import type { StrengthBenchmarkKey } from '@/lib/engine/types'

/**
 * Validation de la fin d'une séance.
 * Tout ce qui est facultatif reste `null` plutôt que 0 : une donnée non
 * saisie n'est pas une donnée nulle.
 */

const optionalNumber = z.number().nullable().optional()

export const strengthSetSchema = z.object({
  exerciseIndex: z.number().int().min(0),
  name: z.string().min(1),
  reps: z.number().min(0).max(999),
  /** Répétitions en réserve ressenties. */
  rir: z.number().min(0).max(10).nullable(),
  /** Clé de repère quand la série était un test. Jamais un repère de natation. */
  test: z
    .enum(['pullups', 'dips', 'muscleups', 'legraises', 'squats', 'pushups'])
    .nullable()
    .optional() satisfies z.ZodType<StrengthBenchmarkKey | null | undefined>,
})

export const finishSessionSchema = z.object({
  sessionId: z.string().uuid(),

  run: z
    .object({
      km: z.number().min(0).max(200),
      minutes: z.number().min(0).max(1440),
      hr: optionalNumber,
      elev: optionalNumber,
      /** Bloc jambes enchaîné réellement effectué. */
      finisherDone: z.boolean().optional(),
    })
    .optional(),

  swim: z
    .object({
      minutes: z.number().min(0).max(600),
      distance: optionalNumber,
      /** Plus longue distance nagée sans pause, en mètres. */
      continuous: z.number().min(0).max(5000),
      pauses: optionalNumber,
      stroke: z.string().max(40).nullable(),
      crawl: z.boolean().optional(),
    })
    .optional(),

  strength: z
    .object({
      sets: z.array(strengthSetSchema),
      minutes: z.number().min(0).max(600),
    })
    .optional(),

  /** Ressenti, commun aux trois disciplines. */
  rpe: z.number().int().min(1).max(10),
  fatigue: z.number().int().min(1).max(10),
  sleep: z.number().min(0).max(24).nullable(),
  pain: z.string().max(300).nullable(),
  note: z.string().max(1000).nullable(),
})

export type FinishSessionInput = z.infer<typeof finishSessionSchema>
export type StrengthSet = z.infer<typeof strengthSetSchema>

/**
 * Ajout d'une séance passée.
 *
 * Sert à rattraper un entraînement fait avant l'installation de l'app, ou fait
 * sans l'ouvrir. Tout y est facultatif sauf la discipline, la date et la durée :
 * ce qui n'est pas saisi reste `null` et sort du calcul, plutôt que d'être
 * comblé par une valeur plausible.
 *
 * Le repère de natation en continu n'y figure pas volontairement. Il se pose
 * lors d'un test, pas de mémoire plusieurs jours après.
 */
export const pastSessionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide.'),
  kind: z.enum(['run', 'swim', 'strength']),
  title: z.string().trim().min(1).max(120),
  minutes: z.number().min(1).max(600),
  /** Kilomètres pour la course, mètres pour la natation. */
  distance: z.number().min(0).max(200_000).nullable(),
  /**
   * Force : un mouvement par ligne. Un total sans exercice ne se rattache à
   * rien — ni à un groupe musculaire, ni à une progression.
   */
  exercises: z
    .array(
      z.object({
        key: z.string().min(1).max(60),
        name: z.string().min(1).max(120),
        sets: z.number().int().min(1).max(50),
        reps: z.number().int().min(1).max(2000),
        unit: z.enum(['reps', 's']),
      }),
    )
    .max(20),
  rpe: z.number().int().min(1).max(10).nullable(),
  note: z.string().max(1000).nullable(),
})

export type PastSessionInput = z.infer<typeof pastSessionSchema>
