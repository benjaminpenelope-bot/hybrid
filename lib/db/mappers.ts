import type {
  AthleteState,
  Benchmark,
  BenchmarkKey,
  DeclaredGoal,
  Exercise,
  Finisher,
  ExtraSession,
  GoalPriority,
  GoalStatus,
  GoalType,
  Limitation,
  Measurement,
  Photo,
  Profile,
  RecordEntry,
  Session,
  SessionKind,
  SessionLog,
  SessionStatus,
  SessionType,
  WeightEntry,
  Wellness,
} from '../engine/types'

/**
 * Traduction entre les lignes Postgres et les objets du moteur.
 * Le moteur ne connait pas la base : c'est le seul endroit ou les deux
 * représentations se rencontrent.
 */

export interface ProfileRow {
  id: string
  name: string
  birth_date: string | null
  height_cm: number | null
  start_weight: string | number | null
  goal_weight: string | number | null
  program_start: string
  race_date: string | null
  rest_weekday: number
  allow_doubles: boolean
  base_weekly_km: string | number | null
  onboarded_at: string | null
}

export interface SessionRow {
  id: string
  user_id: string
  date: string
  type: SessionType
  kind: SessionKind
  status: SessionStatus
  week: number
  title: string
  goal: string | null
  why: string | null
  target: string | null
  cues: string[] | null
  duration: number
  intensity: number
  exercises: Exercise[] | null
  finisher: Finisher | null
  extra: ExtraSession | null
  log: SessionLog | null
  rpe: number | null
  rpe_est: number | null
  note: string | null
  pain: string | null
  edited: boolean
  moved: boolean
  adapted: string | null
  volume_factor: string | number | null
  unplanned: boolean
}

export interface WeightRow {
  date: string
  kg: string | number
  source: 'manual' | 'strava' | 'health'
}

export interface MeasurementRow {
  date: string
  waist: string | number | null
  chest: string | number | null
  arm: string | number | null
  thigh: string | number | null
}

export interface PhotoRow {
  date: string
  storage_path: string
}

export interface WellnessRow {
  date: string
  sleep: string | number | null
  fatigue: number | null
  motivation: number | null
  soreness: string | null
  resting_hr: number | null
}

export interface BenchmarkRow {
  key: BenchmarkKey
  value: string | number
  unit: string
  partial: boolean
  note: string | null
  tested_at: string
}

export interface RecordRow {
  label: string
  value: string
  date: string
}

/** Postgres rend les numériques sous forme de chaîne : on ne perd pas la précision en route. */
const num = (v: string | number | null | undefined): number | null =>
  v === null || v === undefined ? null : typeof v === 'number' ? v : Number(v)

export function rowToProfile(row: ProfileRow): Profile {
  return {
    name: row.name,
    birthDate: row.birth_date,
    heightCm: row.height_cm,
    startWeight: num(row.start_weight) ?? 0,
    goalWeight: num(row.goal_weight) ?? 0,
    programStart: row.program_start,
    raceDate: row.race_date,
    restWeekday: row.rest_weekday,
    allowDoubles: row.allow_doubles,
    baseWeeklyKm: num(row.base_weekly_km),
  }
}

export function rowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    kind: row.kind,
    status: row.status,
    week: row.week,
    title: row.title,
    goal: row.goal ?? undefined,
    why: row.why ?? undefined,
    target: row.target ?? undefined,
    cues: row.cues ?? [],
    duration: row.duration,
    intensity: row.intensity,
    exercises: row.exercises ?? [],
    finisher: row.finisher,
    extra: row.extra,
    log: row.log,
    rpe: row.rpe,
    rpeEst: row.rpe_est,
    note: row.note,
    pain: row.pain,
    edited: row.edited,
    moved: row.moved,
    adapted: row.adapted,
    volumeFactor: num(row.volume_factor),
    unplanned: row.unplanned,
  }
}

export function sessionToRow(session: Session, userId: string): Record<string, unknown> {
  return {
    id: session.id,
    user_id: userId,
    date: session.date,
    type: session.type,
    kind: session.kind,
    status: session.status,
    week: session.week,
    title: session.title,
    goal: session.goal ?? null,
    why: session.why ?? null,
    target: session.target ?? null,
    cues: session.cues ?? [],
    duration: session.duration,
    intensity: session.intensity,
    exercises: session.exercises ?? [],
    finisher: session.finisher ?? null,
    extra: session.extra ?? null,
    log: session.log ?? null,
    rpe: session.rpe ?? null,
    rpe_est: session.rpeEst ?? null,
    note: session.note ?? null,
    pain: session.pain ?? null,
    edited: session.edited ?? false,
    moved: session.moved ?? false,
    adapted: session.adapted ?? null,
    volume_factor: session.volumeFactor ?? null,
    unplanned: session.unplanned ?? false,
    source: session.log?.source ?? 'manual',
  }
}

export function rowToWeight(row: WeightRow): WeightEntry {
  return { date: row.date, kg: num(row.kg) ?? 0, source: row.source }
}

export function rowToMeasurement(row: MeasurementRow): Measurement {
  return {
    date: row.date,
    waist: num(row.waist),
    chest: num(row.chest),
    arm: num(row.arm),
    thigh: num(row.thigh),
  }
}

export function rowToPhoto(row: PhotoRow): Photo {
  return { date: row.date, storagePath: row.storage_path }
}

export function rowToWellness(row: WellnessRow): Wellness {
  return {
    date: row.date,
    sleep: num(row.sleep),
    fatigue: row.fatigue,
    motivation: row.motivation,
    soreness: row.soreness,
    restingHr: row.resting_hr,
  }
}

export function rowToRecord(row: RecordRow): RecordEntry {
  return { label: row.label, value: row.value, date: row.date }
}

/**
 * Repère courant par clé : la ligne la plus récente gagne.
 * Une clé absente reste absente — jamais de valeur par défaut.
 */
export function benchmarksFromRows(rows: BenchmarkRow[]): Record<string, Benchmark | null> {
  const out: Record<string, Benchmark | null> = {}
  const sorted = [...rows].sort((a, b) => a.tested_at.localeCompare(b.tested_at))
  for (const row of sorted) {
    out[row.key] = {
      value: num(row.value) ?? 0,
      partial: row.partial,
      note: row.note ?? undefined,
      testedAt: row.tested_at,
    }
  }
  return out
}

export interface GoalRow {
  id: string
  type: string
  priority: string
  status: string
  target_date: string | null
  target_value: number | string | null
  target_unit: string | null
  note: string | null
}

export interface LimitationRow {
  id: string
  zone: string
  description: string | null
  started_on: string
  ended_on: string | null
}

function rowToGoal(row: GoalRow): DeclaredGoal {
  return {
    id: row.id,
    type: row.type as GoalType,
    priority: row.priority as GoalPriority,
    status: row.status as GoalStatus,
    targetDate: row.target_date,
    targetValue: num(row.target_value) ?? null,
    targetUnit: row.target_unit,
    note: row.note,
  }
}

function rowToLimitation(row: LimitationRow): Limitation {
  return {
    id: row.id,
    zone: row.zone,
    description: row.description,
    startedOn: row.started_on,
    endedOn: row.ended_on,
  }
}

export interface StateRows {
  profile: ProfileRow
  sessions: SessionRow[]
  weights: WeightRow[]
  measurements: MeasurementRow[]
  photos: PhotoRow[]
  wellness: WellnessRow[]
  benchmarks: BenchmarkRow[]
  records: RecordRow[]
  goals: GoalRow[]
  limitations: LimitationRow[]
}

export function stateFromRows(rows: StateRows): AthleteState {
  return {
    profile: rowToProfile(rows.profile),
    sessions: rows.sessions.map(rowToSession),
    weights: rows.weights.map(rowToWeight),
    measures: rows.measurements.map(rowToMeasurement),
    photos: rows.photos.map(rowToPhoto),
    wellness: rows.wellness.map(rowToWellness),
    benchmarks: benchmarksFromRows(rows.benchmarks),
    records: rows.records.map(rowToRecord),
    goals: rows.goals.map(rowToGoal),
    limitations: rows.limitations.map(rowToLimitation),
  }
}
