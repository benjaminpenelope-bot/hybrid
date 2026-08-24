import { z } from 'zod'

/**
 * Questionnaire d'onboarding, en cinq étapes.
 * Le même schéma valide le formulaire côté client et la Server Action :
 * une seule définition, aucune divergence possible.
 */

/** Ce que l'athlète sait d'un repère de force au moment de s'inscrire. */
export const benchmarkClaim = z.discriminatedUnion('mode', [
  /** Jamais mesuré. Aucune ligne n'est créée : le repère s'affichera « À TESTER ». */
  z.object({ mode: z.literal('untested') }),
  /** Minimum connu, maximum réel inconnu. Stocké comme repère partiel. */
  z.object({ mode: z.literal('atleast'), value: z.number().min(1).max(999) }),
  /** Maximum déjà testé. */
  z.object({ mode: z.literal('max'), value: z.number().min(1).max(999) }),
])

export type BenchmarkClaim = z.infer<typeof benchmarkClaim>

export const onboardingSchema = z.object({
  running: z.object({
    /** Séances de course par semaine, aujourd'hui. */
    frequency: z.number().int().min(0).max(7),
    /** Volume hebdomadaire actuel, en km. Détermine la semaine de départ. */
    weeklyKm: z.number().min(0).max(200),
    /** Plus longue distance courue récemment, en km. */
    longestKm: z.number().min(0).max(100),
    experience: z.enum(['premiere', 'reprise', 'regulier', 'confirme']),
  }),

  swimming: z.object({
    frequency: z.number().int().min(0).max(7),
    stroke: z.enum(['aucune', 'brasse', 'crawl', 'les_deux']),
    /** Distance nagée sans pause, en mètres. 0 = à mesurer. */
    continuousM: z.number().min(0).max(5000),
    poolAccess: z.enum(['libre', 'deux_semaine', 'un_semaine', 'rare']),
  }),

  street: z.object({
    equipment: z.array(z.enum(['barre', 'paralleles', 'anneaux', 'lest', 'aucun'])),
    pullups: benchmarkClaim,
    dips: benchmarkClaim,
    muscleups: benchmarkClaim,
    legraises: benchmarkClaim,
  }),

  body: z.object({
    name: z.string().trim().min(1, 'Renseigne un prénom.').max(60),
    heightCm: z.number().int().min(100).max(250),
    currentKg: z.number().min(30).max(250),
    goalKg: z.number().min(30).max(250),
  }),

  availability: z.object({
    /** 0 = dimanche. Tout le microcycle se cale sur ce jour. */
    restWeekday: z.number().int().min(0).max(6),
    /** Durée moyenne disponible par séance, en minutes. */
    sessionMinutes: z.number().int().min(20).max(180),
    allowDoubles: z.boolean(),
    raceDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date attendue au format AAAA-MM-JJ.')
      .nullable(),
  }),
})

export type OnboardingInput = z.infer<typeof onboardingSchema>

export const EXPERIENCE_LABELS: Record<OnboardingInput['running']['experience'], string> = {
  premiere: 'Je débute',
  reprise: 'Je reprends',
  regulier: 'Je cours régulièrement',
  confirme: "J'ai déjà couru une longue distance",
}

export const STROKE_LABELS: Record<OnboardingInput['swimming']['stroke'], string> = {
  aucune: 'Je ne nage pas encore',
  brasse: 'Brasse',
  crawl: 'Crawl',
  les_deux: 'Les deux',
}

export const POOL_LABELS: Record<OnboardingInput['swimming']['poolAccess'], string> = {
  libre: 'Quand je veux',
  deux_semaine: 'Deux fois par semaine',
  un_semaine: 'Une fois par semaine',
  rare: 'Rarement',
}

export const EQUIPMENT_LABELS: Record<
  OnboardingInput['street']['equipment'][number],
  string
> = {
  barre: 'Barre de traction',
  paralleles: 'Barres parallèles',
  anneaux: 'Anneaux',
  lest: 'Gilet ou ceinture lestée',
  aucun: 'Rien pour le moment',
}

export const WEEKDAY_LABELS = [
  'Dimanche',
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
] as const
