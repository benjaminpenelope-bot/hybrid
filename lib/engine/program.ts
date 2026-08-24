import { addDays, daysBetween, weekday as weekdayOf } from './date'
import { half } from './math'
import type {
  Exercise,
  Finisher,
  ISODate,
  Session,
  SessionKind,
  SessionType,
} from './types'

/**
 * MOTEUR DE PROGRAMME
 *
 * Microcycle par défaut, sans aucun double :
 *   J+0 repos · J+1 street haut · J+2 footing + bloc jambes enchaîné
 *   J+3 natation technique · J+4 footing souple · J+5 natation endurance
 *   J+6 sortie longue
 * Les jours sont exprimes en decalage par rapport au jour de repos du profil,
 * si bien que deplacer le repos déplace tout le microcycle.
 */

/** Base par défaut : celle de l'athlète de référence, 15 km en semaine 1. */
export const RUN_KM_W1 = 15
export const RUN_GROWTH = 1.08 // +8 % / semaine
export const DELOAD_EVERY = 4 // toutes les 4 semaines : -30 %

/** Progression maximale tolérée entre le volume actuel et la première semaine. */
export const SAFE_FIRST_STEP = 1.1
/** Volume de première semaine pour qui ne court pas encore. */
export const ABSOLUTE_MIN_BASE = 8

export interface PlanOptions {
  /** 0 = dimanche. Défaut 1 = lundi. */
  restWeekday?: number
  allowDoubles?: boolean
  raceDate?: ISODate | null
  /** Volume de la semaine 1, en km. Voir `baseWeeklyKm`. */
  baseKm?: number
  /** Injectable pour rendre les tests deterministes. */
  makeId?: () => string
}

function defaultId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2, 11)
}

/* ── Volume et phases ──────────────────────────────────────── */

/**
 * Volume de course de la semaine `w`, en km.
 * `baseKm` est le volume de la semaine 1, propre à chaque athlète.
 */
export function weekVolume(w: number, baseKm: number = RUN_KM_W1): number {
  let v = baseKm * Math.pow(RUN_GROWTH, w - 1)
  if (w % DELOAD_EVERY === 0) v *= 0.7
  return half(v)
}

export function isDeloadWeek(w: number): boolean {
  return w % DELOAD_EVERY === 0
}

/**
 * Volume de la première semaine, calé sur ce que l'athlète court déjà.
 *
 * L'échelle du programme est ancrée sur son niveau réel, pas sur une constante :
 * démarrer tout le monde à 15 km ferait tripler la charge de celui qui en court
 * 5, et ferait régresser celui qui en court 40. La première semaine ne dépasse
 * jamais le volume actuel de plus de 10 % — la règle que le programme applique
 * ensuite semaine après semaine.
 */
export function baseWeeklyKm(currentWeeklyKm: number): number {
  if (!Number.isFinite(currentWeeklyKm) || currentWeeklyKm <= 0) return ABSOLUTE_MIN_BASE
  return half(Math.max(ABSOLUTE_MIN_BASE, currentWeeklyKm * SAFE_FIRST_STEP))
}

export type PhaseKey = 'BASE' | 'BUILD' | 'SPECIFIC' | 'TAPER' | 'RACE'

export interface Phase {
  key: PhaseKey
  label: string
  desc: string
}

const PHASES: Record<PhaseKey, Phase> = {
  BASE: {
    key: 'BASE',
    label: 'Base aérobie',
    desc: "Construire le volume et l'endurance fondamentale.",
  },
  BUILD: {
    key: 'BUILD',
    label: 'Développement',
    desc: "Seuil, côtes, sorties longues qui s'allongent.",
  },
  SPECIFIC: {
    key: 'SPECIFIC',
    label: 'Spécifique marathon',
    desc: 'Allure cible, longues avec blocs à allure marathon.',
  },
  TAPER: {
    key: 'TAPER',
    label: 'Affutage',
    desc: 'Volume réduit, intensité conservée.',
  },
  RACE: { key: 'RACE', label: 'Course', desc: 'Marathon.' },
}

/** Phase calee sur le compteur de semaines, quand aucune date de course n'est connue. */
export function runPhase(w: number): Phase {
  if (w <= 12) return PHASES.BASE
  if (w <= 26) return PHASES.BUILD
  if (w <= 42) return PHASES.SPECIFIC
  if (w <= 45) return PHASES.TAPER
  return PHASES.RACE
}

export const TAPER_WEEKS = 3
export const SPECIFIC_WEEKS = 16
export const BUILD_WEEKS = 14
/** Durée minimale pour dérouler une phase spécifique complète plus l'affûtage. */
export const MIN_WEEKS_FOR_SPECIFIC = TAPER_WEEKS + SPECIFIC_WEEKS

/** Phase calee sur la date de course réelle. Prioritaire sur le compteur de semaines. */
export function phaseForRace(date: ISODate, raceDate: ISODate): Phase & { weeksToRace: number } {
  const days = daysBetween(date, raceDate)
  const weeksToRace = Math.ceil(days / 7)
  if (days < 0) return { ...PHASES.RACE, weeksToRace }
  if (weeksToRace <= 0) return { ...PHASES.RACE, weeksToRace }
  if (weeksToRace <= TAPER_WEEKS) return { ...PHASES.TAPER, weeksToRace }
  if (weeksToRace <= TAPER_WEEKS + SPECIFIC_WEEKS) return { ...PHASES.SPECIFIC, weeksToRace }
  if (weeksToRace <= TAPER_WEEKS + SPECIFIC_WEEKS + BUILD_WEEKS)
    return { ...PHASES.BUILD, weeksToRace }
  return { ...PHASES.BASE, weeksToRace }
}

export function phaseAt(date: ISODate, week: number, raceDate?: ISODate | null): Phase {
  return raceDate ? phaseForRace(date, raceDate) : runPhase(week)
}

export interface RaceFeasibility {
  weeksAvailable: number
  /** false = le temps manque pour dérouler la phase spécifique en entier. */
  sufficient: boolean
  message: string
}

/**
 * Évaluation honnete du calendrier. On ne raccourcit jamais silencieusement
 * une phase : si le temps manque, on le dit.
 */
export function raceFeasibility(from: ISODate, raceDate: ISODate): RaceFeasibility {
  const weeksAvailable = Math.floor(daysBetween(from, raceDate) / 7)
  if (weeksAvailable < 0)
    return { weeksAvailable, sufficient: false, message: 'La date de course est déjà passée.' }
  if (weeksAvailable < MIN_WEEKS_FOR_SPECIFIC)
    return {
      weeksAvailable,
      sufficient: false,
      message: `${weeksAvailable} semaines avant la course : il en faut ${MIN_WEEKS_FOR_SPECIFIC} pour une phase spécifique complète plus l'affûtage. La préparation sera tronquée, l'objectif de temps doit être revu ou la date repoussée.`,
    }
  if (weeksAvailable < MIN_WEEKS_FOR_SPECIFIC + BUILD_WEEKS)
    return {
      weeksAvailable,
      sufficient: true,
      message: `${weeksAvailable} semaines avant la course : c'est jouable, mais la base aérobie sera courte. Aucune semaine ne peut être gaspillée.`,
    }
  return {
    weeksAvailable,
    sufficient: true,
    message: `${weeksAvailable} semaines avant la course : le calendrier permet une préparation complète.`,
  }
}

/* ── Contenu des séances de force ──────────────────────────── */

export function buildStrength(kind: 'UPPER' | 'LOWER', w: number): Exercise[] {
  const prog = Math.floor((w - 1) / 3) // +1 rep toutes les 3 semaines
  if (kind === 'UPPER') {
    if (w === 1) {
      return [
        {
          n: 'TEST — Tractions max strictes',
          sets: 1,
          reps: 'AMRAP',
          rest: 240,
          rir: 0,
          cue: 'Une seule série, forme stricte. Arrête dès que le menton ne passe plus proprement.',
          test: 'pullups',
        },
        {
          n: 'TEST — Dips max',
          sets: 1,
          reps: 'AMRAP',
          rest: 240,
          rir: 0,
          cue: 'Amplitude complète, épaules sous contrôle.',
          test: 'dips',
        },
        {
          n: 'TEST — Muscle-ups consécutifs',
          sets: 1,
          reps: 'AMRAP',
          rest: 180,
          rir: 0,
          cue: 'Compte uniquement les répétitions propres, sans kipping excessif.',
          test: 'muscleups',
        },
        {
          n: 'TEST — Relevés de jambes max',
          sets: 1,
          reps: 'AMRAP',
          rest: 120,
          rir: 0,
          cue: "Suspendu à la barre, jambes tendues, orteils au niveau de la barre. Aucun élan : dès que tu balances, la série est finie.",
          test: 'legraises',
        },
        {
          n: 'Tractions — volume léger',
          sets: 3,
          reps: '50 % du max',
          rest: 90,
          rir: 3,
          cue: "Tu viens de tester : on reste loin de l'échec.",
        },
      ]
    }
    return [
      {
        n: 'Tractions strictes',
        sets: 4,
        reps: `${5 + prog}–${8 + prog}`,
        rest: 120,
        rir: 2,
        cue: 'Scapulas basses, menton au-dessus de la barre, descente contrôlée 2 s.',
      },
      {
        n: 'Dips',
        sets: 4,
        reps: `${7 + prog}–${11 + prog}`,
        rest: 120,
        rir: 2,
        cue: 'Buste légèrement penché, coudes proches, épaules loin des oreilles.',
      },
      {
        n: 'Tractions supination',
        sets: 3,
        reps: `${6 + prog}–${9 + prog}`,
        rest: 90,
        rir: 2,
        cue: 'Amplitude complète, pas de balancier.',
      },
      {
        n: 'Pompes lestées ou déclinées',
        sets: 3,
        reps: '10–15',
        rest: 75,
        rir: 2,
        cue: 'Gainage verrouillé, corps en une ligne.',
      },
      {
        n: 'Relevés de jambes suspendu',
        sets: 3,
        reps: '8–12',
        rest: 60,
        rir: 2,
        cue: 'Bassin qui bascule, aucun élan.',
      },
    ]
  }
  return [
    {
      n: 'Squats poids du corps',
      sets: 4,
      reps: `${15 + prog * 2}`,
      rest: 75,
      rir: 3,
      cue: "Talons au sol, genoux dans l'axe, descente sous la parallèle.",
    },
    {
      n: 'Fentes bulgares',
      sets: 3,
      reps: '10 / jambe',
      rest: 90,
      rir: 2,
      cue: 'Buste droit, genou arrière qui descend, appui sur tout le pied avant.',
    },
    {
      n: 'Squats sautés',
      sets: 4,
      reps: '8',
      rest: 90,
      rir: 3,
      cue: 'Réception amortie et silencieuse. Qualité avant quantité.',
    },
    {
      n: 'Hip thrust au sol / pont fessier unilatéral',
      sets: 3,
      reps: '12 / jambe',
      rest: 60,
      rir: 2,
      cue: 'Verrouille en haut 1 s, pas de cambrure lombaire.',
    },
    {
      n: 'Mollets debout',
      sets: 3,
      reps: '20',
      rest: 45,
      rir: 2,
      cue: 'Amplitude complète — assurance tendineuse pour la course.',
    },
    {
      n: 'Gainage planche',
      sets: 3,
      reps: '45 s',
      rest: 45,
      rir: 2,
      cue: 'Bassin verrouillé, fessiers serrés.',
      unit: 's',
    },
  ]
}

/** Bloc jambes de 12 min enchaîné après le footing, quand les doubles sont refuses. */
export function buildLegFinisher(w: number): Finisher {
  const prog = Math.floor((w - 1) / 3)
  return {
    title: 'Bloc jambes — 12 min enchaîné',
    duration: 12,
    why: "Le volume de course va doubler en trois mois. Sans travail de force, ce sont les tendons qui lâchent en premier. Enchaîne ici, ce bloc évite un double dans la semaine.",
    exercises: [
      {
        n: 'Squats poids du corps',
        sets: 3,
        reps: `${15 + prog * 2}`,
        rest: 45,
        rir: 3,
        cue: "Talons au sol, genoux dans l'axe. Jambes déjà chaudes : ne cherche pas la charge.",
      },
      {
        n: 'Fentes bulgares',
        sets: 2,
        reps: '10 / jambe',
        rest: 45,
        rir: 3,
        cue: 'Buste droit, appui sur tout le pied avant.',
      },
      {
        n: 'Mollets debout',
        sets: 2,
        reps: '20',
        rest: 30,
        rir: 2,
        cue: "Amplitude complète — protection du tendon d'Achille.",
      },
      {
        n: 'Gainage planche',
        sets: 2,
        reps: '45 s',
        rest: 30,
        rir: 2,
        cue: 'Bassin verrouillé, fessiers serrés.',
        unit: 's',
      },
    ],
  }
}

/* ── Natation ──────────────────────────────────────────────── */

export interface SwimRung {
  /** Distance continue visee, en mètres. */
  d: number
  session: string
  endurance: string
}

const SWIM_LADDER: SwimRung[] = [
  {
    d: 50,
    session: '8 × 25 m brasse, 30 s de repos + 4 × 25 m éducatifs crawl',
    endurance: '12 × 25 m brasse, 20 s de repos — 300 m au total',
  },
  {
    d: 75,
    session: '6 × 50 m brasse continus, 40 s de repos + 4 × 25 m crawl',
    endurance: '8 × 50 m brasse, 25 s de repos — 400 m au total',
  },
  {
    d: 100,
    session: '5 × 75 m brasse, 45 s de repos + 6 × 25 m crawl',
    endurance: '6 × 100 m brasse, 30 s de repos — 600 m au total',
  },
  {
    d: 150,
    session: '4 × 100 m brasse, 60 s de repos + 4 × 50 m crawl',
    endurance: '5 × 150 m, 40 s de repos — 750 m au total',
  },
  {
    d: 200,
    session: '3 × 150 m brasse + 4 × 50 m crawl',
    endurance: '4 × 200 m, 45 s de repos — 800 m au total',
  },
  {
    d: 300,
    session: '2 × 200 m + 1 × 100 m, récup 90 s',
    endurance: '3 × 300 m, 60 s de repos — 900 m au total',
  },
  {
    d: 400,
    session: '2 × 300 m, récup 2 min',
    endurance: '2 × 400 m + 200 m souple — 1 000 m au total',
  },
  {
    d: 600,
    session: '1 × 500 m + 2 × 100 m',
    endurance: '1 × 600 m + 2 × 200 m — 1 000 m au total',
  },
  {
    d: 800,
    session: '1 × 750 m + 200 m souple',
    endurance: '1 × 800 m + 400 m souple — 1 200 m au total',
  },
  { d: 1000, session: '1 × 1 000 m continu', endurance: '1 × 1 000 m continu + 300 m souple' },
  { d: 1200, session: '1 × 1 200 m continu', endurance: '1 × 1 200 m continu + 300 m souple' },
  {
    d: 1500,
    session: '1 × 1 500 m continu — objectif atteint',
    endurance: '1 × 1 500 m continu — objectif atteint',
  },
]

export function swimTarget(w: number): SwimRung {
  const i = Math.min(SWIM_LADDER.length - 1, Math.max(0, Math.floor((w - 1) / 3)))
  return SWIM_LADDER[i] as SwimRung
}

export const swimLadder = (): SwimRung[] => SWIM_LADDER.map((r) => ({ ...r }))

/* ── Construction d'une séance ─────────────────────────────── */

/** Emplacement dans le microcycle, exprime en jours après le jour de repos. */
export type Slot = 0 | 1 | 2 | 3 | 4 | 5 | 6

export const KIND_OF: Record<SessionType, SessionKind> = {
  RUN: 'run',
  LONG: 'run',
  SWIM: 'swim',
  UPPER: 'strength',
  LOWER: 'strength',
  REST: 'rest',
}

/** Emplacement par défaut de chaque type, utilise quand l'editeur change le type d'un jour. */
export const SLOT_OF: Record<SessionType, Slot> = {
  REST: 0,
  UPPER: 1,
  RUN: 2,
  SWIM: 3,
  LOWER: 5,
  LONG: 6,
}

export function slotFor(weekday: number, restWeekday: number): Slot {
  return ((((weekday - restWeekday) % 7) + 7) % 7) as Slot
}

const SLOT_TYPE: Record<Slot, SessionType> = {
  0: 'REST',
  1: 'UPPER',
  2: 'RUN',
  3: 'SWIM',
  4: 'RUN',
  5: 'SWIM',
  6: 'LONG',
}

export interface RunSplit {
  /** Footing souple, 30 % du volume. */
  easy: number
  /** Endurance fondamentale, 28 % du volume. */
  fundamental: number
  /** Sortie longue, le reste. */
  long: number
}

export function runSplit(w: number, baseKm: number = RUN_KM_W1): RunSplit {
  const vol = weekVolume(w, baseKm)
  const easy = half(vol * 0.3)
  const fundamental = half(vol * 0.28)
  return { easy, fundamental, long: half(vol - easy - fundamental) }
}

/**
 * Construit la séance d'un jour donne.
 *
 * @param weekday jour de la semaine, 0 = dimanche
 * @param forcedType impose un type, en ignorant le microcycle (editeur de séance)
 */
export function buildSession(
  date: ISODate,
  week: number,
  weekday: number,
  forcedType?: SessionType,
  opts: PlanOptions = {},
): Session {
  const {
    restWeekday = 1,
    allowDoubles = false,
    raceDate = null,
    baseKm = RUN_KM_W1,
    makeId = defaultId,
  } = opts
  const w = Math.max(1, week)
  const { easy, fundamental, long } = runSplit(w, baseKm)
  const phase = phaseAt(date, w, raceDate)
  const base = {
    id: makeId(),
    date,
    status: 'planned' as const,
    week: w,
    cues: [] as string[],
    finisher: null,
    extra: null,
  }

  const slot: Slot = forcedType ? SLOT_OF[forcedType] : slotFor(weekday, restWeekday)
  // Sans doubles, le samedi est une natation endurance et les jambes sont
  // enchainees au footing du mercredi. Avec doubles, le samedi redevient
  // une séance LOWER complète doublee de la natation endurance.
  const type: SessionType =
    forcedType ?? (slot === 5 ? (allowDoubles ? 'LOWER' : 'SWIM') : SLOT_TYPE[slot])

  switch (type) {
    case 'REST':
      return {
        ...base,
        type: 'REST',
        kind: 'rest',
        title: 'Récupération complète',
        duration: 0,
        intensity: 0,
        exercises: [],
        goal: "Laisser les adaptations se faire. C'est ici que tu progresses.",
        why: "Sept jours d'affilée sans coupure, c'est la voie rapide vers la blessure de surcharge quand le volume de course monte.",
        cues: [
          'Marche 20–30 min si tu veux bouger',
          'Mobilité hanches / chevilles 10 min',
          'Vise 8 h de sommeil',
        ],
      }

    case 'UPPER':
      return {
        ...base,
        type: 'UPPER',
        kind: 'strength',
        title: 'Haut du corps',
        duration: 50,
        intensity: 3,
        goal: 'Force relative sur barre. Tractions et dips en progression douce.',
        why: "La force relative se construit loin de l'échec, en repetant des séries propres semaine après semaine. Le jour de test est la seule exception.",
        target: "Jamais à l'échec sauf jour de test. Si la dernière répétition se dégrade, la série est finie.",
        cues: [
          'Échauffe les épaules et les coudes 5 min avant la première traction',
          'Repos complet entre les séries : la qualité prime sur la densite',
        ],
        exercises: buildStrength('UPPER', w),
      }

    case 'RUN': {
      const km = slot === 4 ? easy : fundamental
      const isEasy = slot === 4
      if (isEasy) {
        return {
          ...base,
          type: 'RUN',
          kind: 'run',
          title: `Footing souple — ${km} km`,
          duration: Math.round(km * 6.7),
          intensity: 2,
          goal: `${km} km vraiment lents, jambes encore chargées de la veille.`,
          why: "Cette séance sert à accumuler du temps de course, pas à performer.",
          target: 'Allure 6:30–7:00/km. Si les jambes sont lourdes, coupe à 20 min sans culpabiliser.',
          cues: [
            'Terminer avec la sensation de pouvoir en refaire autant',
            '4 × 20 s de lignes droites en fin de séance',
          ],
          exercises: [
            {
              n: 'Footing continu',
              sets: 1,
              reps: `${km} km`,
              rest: 0,
              rir: 4,
              cue: 'Lent. Vraiment lent.',
            },
          ],
        }
      }
      const finisher = allowDoubles ? null : buildLegFinisher(w)
      return {
        ...base,
        type: 'RUN',
        kind: 'run',
        title: `Endurance fondamentale — ${km} km`,
        duration: Math.round(km * 6.6) + (finisher ? finisher.duration : 0),
        intensity: 2,
        goal: `${km} km à 6:20–6:50/km, FC sous 150 bpm${finisher ? ', puis bloc jambes enchaîné' : ''}.`,
        why: '80 % du volume marathon se court lentement. C\'est ce qui construit le réseau capillaire et la solidité tendineuse.',
        target: 'Allure 6:20–6:50/km · FC moyenne < 150 bpm',
        cues: [
          'Tu dois pouvoir parler en courant',
          'Cadence 170–180 pas/min',
          'Si la FC dérive au-dessus de 155, ralentis',
          ...(finisher ? ['Bloc jambes immediatement après le footing, sans repasser par la case canape'] : []),
        ],
        exercises: [
          {
            n: 'Footing continu',
            sets: 1,
            reps: `${km} km`,
            rest: 0,
            rir: 4,
            cue: 'Allure conversationnelle du début à la fin.',
          },
        ],
        finisher,
      }
    }

    case 'SWIM': {
      const rung = swimTarget(w)
      const isEndurance = slot === 5
      return {
        ...base,
        type: 'SWIM',
        kind: 'swim',
        title: isEndurance ? 'Natation — endurance' : 'Natation — technique + fractionne',
        duration: 45,
        intensity: isEndurance ? 3 : 2,
        goal: isEndurance
          ? `Allonger la distance nagee sans pause. Palier en cours : ${rung.d} m.`
          : 'Construire la distance continue en brasse et poser les bases du crawl.',
        why: "Passer de 25 m continus à 1 500 m est d'abord un problème technique et respiratoire, pas un problème de condition physique.",
        target: isEndurance ? rung.endurance : rung.session,
        cues: isEndurance
          ? [
              'Compte tes longueurs : sans ce chiffré, aucune progression n\'est mesurable',
              'Note la plus longue distance enchaînée sans pause, pas seulement le total',
              'Ralentis plutot que de t\'arrêter',
            ]
          : [
              "Brasse : temps de glisse d'1 s bras tendus après chaque poussée",
              'Crawl : 4 × 25 m battements avec planche, puis 4 × 25 m rattrapé',
              'Souffle dans l\'eau en continu, jamais de blocage',
            ],
        exercises: [
          {
            n: 'Bloc principal',
            sets: 1,
            reps: isEndurance ? rung.endurance : rung.session,
            rest: 0,
            rir: 3,
            cue: isEndurance ? 'Régularité. Le chrono ne compte pas ici.' : 'Repos 30 s entre les longueurs.',
          },
        ],
      }
    }

    case 'LOWER':
      return {
        ...base,
        type: 'LOWER',
        kind: 'strength',
        title: 'Bas du corps + gainage',
        duration: 45,
        intensity: 3,
        goal: 'Renforcement structurel : genoux, chevilles, chaîne postérieure.',
        why: 'Le volume de course va doubler en trois mois. Sans travail de force, ce sont les tendons qui lâchent en premier.',
        target: "Pas d'échec musculaire. On cherche la qualité de mouvement et la resistance tendineuse.",
        cues: [
          'Place 24 h avant la sortie longue : reste à RIR 2–3',
          'Si les cuisses tirent encore demain matin, tu es alle trop loin',
        ],
        exercises: buildStrength('LOWER', w),
        extra:
          allowDoubles && slot === 5
            ? {
                type: 'SWIM',
                kind: 'swim',
                title: 'Natation endurance',
                duration: 45,
                target: swimTarget(w).endurance,
              }
            : null,
      }

    default:
      return {
        ...base,
        type: 'LONG',
        kind: 'run',
        title: `Sortie longue — ${long} km`,
        duration: Math.round(long * 7),
        intensity: 3,
        goal: `${long} km en continu, très lentement.`,
        why: `Phase ${phase.label}. La sortie longue est la séance qui décide de ton marathon. On l'allonge de 1 km par semaine maximum.`,
        target: "Allure 6:40–7:10/km. L'objectif est la durée, pas l'allure.",
        cues: [
          'Pars plus lentement que ce qui te semble confortable',
          'Bois si la sortie dépasse 60 min',
          'Si tu dois marcher 2 min, marche — la séance reste réussie',
        ],
        exercises: [
          {
            n: 'Sortie longue',
            sets: 1,
            reps: `${long} km`,
            rest: 0,
            rir: 4,
            cue: 'Régularité du début à la fin.',
          },
        ],
      }
  }
}

export function generatePlan(
  fromDate: ISODate,
  weeks = 8,
  startWeek = 1,
  opts: PlanOptions = {},
): Session[] {
  const out: Session[] = []
  for (let i = 0; i < weeks * 7; i++) {
    const date = addDays(fromDate, i)
    const w = startWeek + Math.floor(i / 7)
    out.push(buildSession(date, w, weekdayOf(date), undefined, opts))
  }
  return out
}

/**
 * Reporte une séance au lendemain. Si le lendemain est déjà occupé, les deux
 * jours sont echanges : le jour de repos se déplace donc avec la séance.
 */
export function rotatePostpone(sessions: Session[], id: string): Session[] {
  const s = sessions.find((x) => x.id === id)
  if (!s) return sessions
  const nd = addDays(s.date, 1)
  const other = sessions.find((x) => x.date === nd && x.status === 'planned')
  if (!other) return sessions.map((x) => (x.id === id ? { ...x, date: nd, moved: true } : x))
  return sessions.map((x) =>
    x.id === id
      ? { ...x, date: nd, moved: true }
      : x.id === other.id
        ? { ...x, date: s.date, moved: true }
        : x,
  )
}
