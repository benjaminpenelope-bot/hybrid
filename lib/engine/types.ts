/**
 * Types du moteur métier.
 * Le moteur ne connait ni React ni Supabase : il prend un état et une date,
 * il rend un résultat. Tout est pur et testable.
 */

/** Date au format YYYY-MM-DD. */
export type ISODate = string

/** `RIDE` est a `BIKE` ce que `LONG` est a `RUN` : la sortie longue. */
export type SessionType = 'RUN' | 'LONG' | 'SWIM' | 'BIKE' | 'RIDE' | 'UPPER' | 'LOWER' | 'REST'
export type SessionKind = 'run' | 'swim' | 'bike' | 'strength' | 'rest'
export type SessionStatus = 'planned' | 'done' | 'skipped'

export type BenchmarkKey =
  | 'pullups'
  | 'dips'
  | 'muscleups'
  | 'legraises'
  | 'squats'
  | 'pushups'
  /** Distance nagée sans pause, en mètres. Déclarable avant toute séance enregistrée. */
  | 'swim_continuous'

/**
 * Repères testables au cours d'une séance de force.
 * La distance nagée se mesure en bassin, jamais par une série d'exercice.
 */
export type StrengthBenchmarkKey = Exclude<BenchmarkKey, 'swim_continuous'>

export type DataSource = 'manual' | 'strava' | 'health'

export interface Exercise {
  /** Nom de l'exercice. */
  n: string
  sets: number
  reps: string
  /** Repos en secondes. */
  rest: number
  /** Répétitions en réserve. 0 = jusqu'a l'échec (jour de test uniquement). */
  rir: number
  cue: string
  /** Unite de la saisie quand ce ne sont pas des répétitions (ex : 's'). */
  unit?: string
  /** Renseigné quand la série est un test de repère. */
  test?: StrengthBenchmarkKey
}

/** Bloc enchaîné à la suite de la séance principale (ex : jambes après le footing). */
export interface Finisher {
  title: string
  duration: number
  why: string
  exercises: Exercise[]
}

/** Séance supplementaire du même jour, uniquement si les doubles sont autorises. */
export interface ExtraSession {
  type: SessionType
  kind: SessionKind
  title: string
  duration: number
  target: string
}

export interface TestResult {
  key: BenchmarkKey
  name: string
  value: number
  unit?: string
}

export interface SessionLog {
  /** Course : distance en km. */
  km?: number | null
  /** Durée effective en minutes, toutes disciplines. */
  minutes?: number | null
  /** Frequence cardiaque moyenne. */
  hr?: number | null
  /** Denivele positif en mètres. */
  elev?: number | null
  /** Natation : distance totale en mètres. */
  distance?: number | null
  /** Natation : plus longue distance nagee sans pause, en mètres. */
  continuous?: number | null
  pauses?: number | null
  stroke?: string | null
  crawl?: boolean
  /** Force : répétitions totales de la séance. */
  reps?: number | null
  sets?: number | null
  /**
   * Détail par mouvement. « 45 répétitions » sans nom d'exercice ne dit ni ce
   * qui a travaillé ni ce qui progresse : le total seul ne suffit pas.
   */
  exercises?: { key: string; name: string; sets: number; reps: number; unit: 'reps' | 's' }[]
  note?: string | null
  tests?: TestResult[]
  source?: DataSource
}

export interface Session {
  id: string
  date: ISODate
  type: SessionType
  kind: SessionKind
  status: SessionStatus
  week: number
  title: string
  goal?: string
  why?: string
  target?: string
  cues: string[]
  duration: number
  /** Intensité ressentie prévue, de 0 à 5. */
  intensity: number
  exercises: Exercise[]
  finisher?: Finisher | null
  extra?: ExtraSession | null
  log?: SessionLog | null
  /** RPE saisi par l'athlete. Prioritaire sur rpeEst. */
  rpe?: number | null
  /** RPE estimé pour une séance importée ou reconstituée. Marque comme estimé. */
  rpeEst?: number | null
  note?: string | null
  pain?: string | null
  edited?: boolean
  moved?: boolean
  /** Trace de l'adaptation automatique appliquée à cette séance. */
  adapted?: string | null
  /** Facteur de volume appliqué par l'adaptation automatique. */
  volumeFactor?: number | null
  /** Séance enregistrée hors programme (import Strava sans correspondance). */
  unplanned?: boolean
}

export interface Benchmark {
  value: number
  /** true = minimum connu, maximum réel non testé. Sort du calcul du score. */
  partial: boolean
  note?: string
  testedAt: ISODate
}

export type Benchmarks = Partial<Record<BenchmarkKey, Benchmark | null>>

export interface WeightEntry {
  date: ISODate
  kg: number
  source?: DataSource
}

export interface Measurement {
  date: ISODate
  waist?: number | null
  chest?: number | null
  arm?: number | null
  thigh?: number | null
}

export interface Photo {
  date: ISODate
  storagePath: string
}

export interface Wellness {
  date: ISODate
  /** Heures de sommeil. */
  sleep?: number | null
  /** 1 = frais, 10 = vide. */
  fatigue?: number | null
  /** 1 à 10. */
  motivation?: number | null
  soreness?: string | null
  restingHr?: number | null
  source?: DataSource
}

export interface RecordEntry {
  label: string
  value: string
  date: ISODate
}

export interface Profile {
  name: string
  /**
   * Renseigne a l'inscription. Aucun calcul ne s'en sert encore : il part au
   * coach, qui s'adresse a la personne au bon genre et rapporte ses reperes
   * a la bonne reference. `null` quand elle a prefere ne pas preciser.
   */
  sex?: 'homme' | 'femme' | 'autre' | null
  birthDate?: ISODate | null
  heightCm?: number | null
  startWeight: number
  goalWeight: number
  programStart: ISODate
  /** Date du marathon cible. Null = programme cale sur le compteur de semaines. */
  raceDate?: ISODate | null
  /** 0 = dimanche. Défaut 1 = lundi. */
  restWeekday: number
  allowDoubles: boolean
  /** Volume de course de la semaine 1, en km. Ancre l'échelle du programme. */
  baseWeeklyKm?: number | null
  /** Sports declares. Vide pour un compte anterieur au questionnaire. */
  sports: Sport[]
  /**
   * Jours ou l'athlete peut s'entrainer, 0 = dimanche. Vide = inconnu, et le
   * planificateur retombe alors sur le microcycle complet.
   */
  availableWeekdays: number[]
}

/** Sports proposes a l'onboarding. Miroir de l'enum `sport`. */
export type Sport = 'running' | 'cycling' | 'swimming' | 'strength' | 'street_workout'

/** Types d'objectif proposes a l'onboarding. Miroir de l'enum `goal_type`. */
export type GoalType =
  | 'marathon'
  | 'semi'
  | 'dix_km'
  | 'hyrox'
  | 'force'
  | 'hypertrophie'
  | 'street_workout'
  | 'endurance'
  | 'hybride'

export type GoalPriority = 'principal' | 'secondaire'
export type GoalStatus = 'actif' | 'atteint' | 'abandonne'

/**
 * Objectif tel que l'athlete l'a declare, par opposition aux jalons que le
 * moteur en derive. Un seul objectif principal peut etre actif a la fois,
 * garanti par un index unique en base.
 */
export interface DeclaredGoal {
  id: string
  type: GoalType
  priority: GoalPriority
  status: GoalStatus
  /** Echeance facultative : on peut viser un marathon sans date. */
  targetDate: ISODate | null
  /** Cible chiffree, interpretee selon le type. Null = cible par defaut. */
  targetValue: number | null
  targetUnit: string | null
  note: string | null
}

/**
 * Contrainte physique declaree. `endedOn` a null signifie « toujours en
 * cours » : c'est ce qui distingue une blessure actuelle d'un antecedent.
 */
export interface Limitation {
  id: string
  zone: string
  description: string | null
  startedOn: ISODate
  endedOn: ISODate | null
}

export interface AthleteState {
  profile: Profile
  sessions: Session[]
  weights: WeightEntry[]
  measures: Measurement[]
  photos: Photo[]
  wellness: Wellness[]
  benchmarks: Benchmarks
  records: RecordEntry[]
  /** Objectifs declares a l'onboarding. Vide tant que l'athlete n'a rien dit. */
  goals: DeclaredGoal[]
  /** Limitations declarees. Voir `limitationsActives` pour celles en cours. */
  limitations: Limitation[]
}

/** Une composante de sous-score. `v === null` : donnée non mesurée, exclue du calcul. */
export interface ScorePart {
  k: string
  /** Poids de la composante dans son sous-score. */
  w: number
  v: number | null
  detail: string
}

export interface Aggregate {
  /** null quand aucune composante n'est mesurée. */
  score: number | null
  /** Part du poids du sous-score reposant sur une donnée réelle, de 0 à 1. */
  coverage: number
  parts: ScorePart[]
}

export interface SubScore extends Aggregate {
  label: string
  icon: string
  color: string
  /** Poids du sous-score dans le score global, en pourcentage. */
  weight: number
}

export type SubScoreKey =
  | 'running'
  | 'natation'
  | 'physique'
  | 'street'
  | 'force'
  | 'endurance'
  | 'recuperation'

export interface Scores {
  subs: Record<SubScoreKey, SubScore>
  global: number
  /** Part du score non couverte par une donnée réellement mesurée, en %. */
  missing: number
  /** Complement de `missing`, de 0 à 1. */
  coverage: number
}

/** UNKNOWN : aucune composante mesurée. Le score affiché n'est pas un diagnostic. */
export type RecoveryZone = 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN'

export interface Recovery extends Aggregate {
  score: number
  /** false quand le score ne repose sur aucune donnée : ne rien en conclure. */
  measured: boolean
  zone: RecoveryZone
  acwr: number
  l7: number
  l28: number
  streak: number
  soreness: string | null
}
