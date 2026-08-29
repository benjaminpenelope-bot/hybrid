import { z } from 'zod'

/**
 * Questionnaire d'onboarding.
 *
 * Le même schéma valide le formulaire côté client et la Server Action : une
 * seule définition, aucune divergence possible.
 *
 * Réorganisé autour des sports déclarés. Les questions propres à une
 * discipline ne sont posées, et exigées, que si l'athlète la pratique — un
 * cycliste n'a rien à répondre sur sa nage.
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

export const SPORTS = ['running', 'cycling', 'swimming', 'strength', 'street_workout'] as const

/**
 * Sports dont le generateur sait deduire des seances.
 *
 * Tous, desormais. Le velo etait le dernier absent : il etait declarable au
 * profil mais aucune seance ne s'en deduisait, si bien que le declarer seul
 * livrait un programme vide — d'ou le refus qui vivait ici.
 *
 * La constante reste : elle documente l'invariant, et un sport ajoute demain
 * sans seance correspondante se ferait de nouveau attraper ici plutot qu'a
 * l'ecran.
 */
export const PLANIFIABLES: readonly (typeof SPORTS)[number][] = [
  'running',
  'cycling',
  'swimming',
  'strength',
  'street_workout',
]
export const NIVEAUX = ['debutant', 'intermediaire', 'avance', 'expert'] as const
export const OBJECTIFS = [
  'marathon',
  'semi',
  'dix_km',
  'hyrox',
  'force',
  'hypertrophie',
  'street_workout',
  'endurance',
  'hybride',
] as const

const objectif = z.object({
  type: z.enum(OBJECTIFS),
  /** Échéance facultative : on peut viser un marathon sans date. */
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date attendue au format AAAA-MM-JJ.')
    .nullable(),
})

/** Détail demandé uniquement à qui déclare courir. */
const detailRunning = z.object({
  frequency: z.number().int().min(0).max(7),
  /** Volume hebdomadaire actuel, en km. Ancre la semaine de départ. */
  weeklyKm: z.number().min(0).max(200),
  longestKm: z.number().min(0).max(100),
})

/** Détail demandé uniquement à qui déclare nager. */
const detailSwimming = z.object({
  frequency: z.number().int().min(0).max(7),
  stroke: z.enum(['aucune', 'brasse', 'crawl', 'les_deux']),
  /** Distance nagée sans pause, en mètres. 0 = à mesurer, jamais supposé. */
  continuousM: z.number().min(0).max(5000),
  poolAccess: z.enum(['libre', 'deux_semaine', 'un_semaine', 'rare']),
})

/** Détail demandé à qui déclare de la force ou du street workout. */
const detailForce = z.object({
  equipment: z.array(z.enum(['barre', 'paralleles', 'anneaux', 'lest', 'aucun'])),
  pullups: benchmarkClaim,
  dips: benchmarkClaim,
  muscleups: benchmarkClaim,
  legraises: benchmarkClaim,
})

export const onboardingSchema = z
  .object({
    profil: z.object({
      name: z.string().trim().min(1, 'Renseigne un prénom.').max(60),
      /** Facultatif et libre de le rester : « sexe si renseigné ». */
      sex: z.enum(['homme', 'femme', 'autre']).nullable(),
      birthDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date attendue au format AAAA-MM-JJ.')
        .nullable(),
      heightCm: z.number().int().min(100).max(250),
      currentKg: z.number().min(30).max(250),
      goalKg: z.number().min(30).max(250),
      level: z.enum(NIVEAUX),
    }),

    sports: z.array(z.enum(SPORTS)).min(1, 'Choisis au moins un sport.'),

    objectifs: z.object({
      principal: objectif,
      /** Un seul secondaire : au-delà, plus rien n'est prioritaire. */
      secondaire: objectif.nullable(),
    }),

    disponibilites: z.object({
      /** 0 = dimanche. Le jour de repos se déduit des jours non retenus. */
      availableWeekdays: z.array(z.number().int().min(0).max(6)),
      sessionMinutes: z.number().int().min(20).max(180),
      allowDoubles: z.boolean(),
    }),

    limitations: z
      .array(
        z.object({
          zone: z.string().trim().min(1).max(60),
          description: z.string().trim().max(300),
        }),
      )
      .max(5),

    running: detailRunning.nullable(),
    swimming: detailSwimming.nullable(),
    force: detailForce.nullable(),
  })
  .superRefine((v, ctx) => {
    /*
     * Au moins deux jours d'entraînement, au plus six : un programme a besoin
     * de plusieurs séances pour progresser, et d'au moins une coupure pour
     * que le corps encaisse. C'est aussi ce qui rend le jour de repos
     * déductible sans poser une seconde question.
     */
    const jours = new Set(v.disponibilites.availableWeekdays)
    if (jours.size < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['disponibilites', 'availableWeekdays'],
        message: 'Choisis au moins deux jours.',
      })
    }
    if (jours.size > 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['disponibilites', 'availableWeekdays'],
        message: 'Garde au moins un jour de repos.',
      })
    }

    /*
     * Le détail d'une discipline est exigé si et seulement si elle est
     * déclarée. Sans cette règle, on demanderait sa nage à un cycliste, ou
     * on générerait un programme de course sans connaître son volume.
     */
    if (v.sports.includes('running') && !v.running) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['running'], message: 'Détail de course manquant.' })
    }
    if (v.sports.includes('swimming') && !v.swimming) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['swimming'], message: 'Détail de natation manquant.' })
    }
    const faitDeLaForce = v.sports.includes('strength') || v.sports.includes('street_workout')
    if (faitDeLaForce && !v.force) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['force'], message: 'Détail de force manquant.' })
    }

    /* Un objectif secondaire identique au principal ne veut rien dire. */
    if (v.objectifs.secondaire && v.objectifs.secondaire.type === v.objectifs.principal.type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['objectifs', 'secondaire'],
        message: 'Choisis un objectif secondaire différent du principal.',
      })
    }
  })

export type OnboardingInput = z.infer<typeof onboardingSchema>

/* ── Libellés ──────────────────────────────────────────────── */

export const SPORT_LABELS: Record<(typeof SPORTS)[number], string> = {
  running: 'Course',
  cycling: 'Cyclisme',
  swimming: 'Natation',
  strength: 'Musculation',
  street_workout: 'Street workout',
}

export const NIVEAU_LABELS: Record<(typeof NIVEAUX)[number], string> = {
  debutant: 'Je débute',
  intermediaire: 'Je m’entraîne régulièrement',
  avance: 'Je m’entraîne depuis des années',
  expert: 'Je compète',
}

export const OBJECTIF_LABELS: Record<(typeof OBJECTIFS)[number], string> = {
  marathon: 'Courir un marathon',
  semi: 'Courir un semi-marathon',
  dix_km: 'Améliorer mon 10 km',
  hyrox: 'Préparer un HYROX',
  force: 'Gagner en force',
  hypertrophie: 'Prendre du muscle',
  street_workout: 'Progresser en street workout',
  endurance: 'Améliorer mon endurance',
  hybride: 'Performer sur plusieurs disciplines',
}

export const STROKE_LABELS: Record<
  NonNullable<OnboardingInput['swimming']>['stroke'],
  string
> = {
  aucune: 'Je ne nage pas encore',
  brasse: 'Brasse',
  crawl: 'Crawl',
  les_deux: 'Les deux',
}

export const POOL_LABELS: Record<
  NonNullable<OnboardingInput['swimming']>['poolAccess'],
  string
> = {
  libre: 'Quand je veux',
  deux_semaine: 'Deux fois par semaine',
  un_semaine: 'Une fois par semaine',
  rare: 'Rarement',
}

export const WEEKDAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'] as const

export const EQUIPMENT_LABELS: Record<
  NonNullable<OnboardingInput['force']>['equipment'][number],
  string
> = {
  barre: 'Barre de traction',
  paralleles: 'Barres parallèles',
  anneaux: 'Anneaux',
  lest: 'Lest ou gilet',
  aucun: 'Rien pour l’instant',
}

/**
 * Jour de repos déduit des jours retenus : le premier jour non disponible, en
 * partant du lundi. Le générateur actuel cale tout le microcycle dessus.
 */
export function restWeekdayFrom(availableWeekdays: number[]): number {
  const dispo = new Set(availableWeekdays)
  for (const j of [1, 2, 3, 4, 5, 6, 0]) if (!dispo.has(j)) return j
  return 1
}
