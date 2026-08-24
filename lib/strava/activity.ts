import type { ISODate, SessionKind } from '@/lib/engine/types'

/**
 * TRADUCTION D'UNE ACTIVITÉ STRAVA
 *
 * Strava mesure ce qu'un GPS et un cardio savent mesurer : une distance, une
 * durée, un dénivelé, parfois une fréquence cardiaque. Il ne sait rien du
 * ressenti, ni de la façon dont une longueur a été nagée.
 *
 * Ce module ne remplit donc que les champs réellement mesurés. Tout le reste
 * reste `null` et l'écran le montre comme « à saisir ». En particulier :
 *
 * - le RPE n'est repris que si l'athlète l'a lui-même noté dans Strava ;
 * - une nage de 800 m n'est jamais lue comme 800 m en continu. C'est le
 *   repère qui décide de la note de natation : le déduire d'un total
 *   fabriquerait une performance jamais réalisée.
 */

/** Sous-ensemble de la réponse Strava réellement utilisé. */
export interface StravaActivity {
  id: number
  name: string
  type: string
  sport_type?: string
  start_date_local: string
  /** Mètres. */
  distance: number
  /** Secondes, hors pauses. */
  moving_time: number
  elapsed_time: number
  total_elevation_gain?: number | null
  average_heartrate?: number | null
  /** Noté par l'athlète dans Strava, sur 10. Rarement présent. */
  perceived_exertion?: number | null
  /** Saisie manuelle dans Strava : aucune trace GPS derrière. */
  manual?: boolean
}

export interface ActiviteImportee {
  stravaId: number
  date: ISODate
  kind: SessionKind
  title: string
  minutes: number
  /** RPE seulement s'il vient de l'athlète. Jamais déduit d'une allure. */
  rpe: number | null
  log: Record<string, number | string | boolean | null>
  /** Ce que Strava ne dit pas et que l'athlète devra compléter. */
  aCompleter: string[]
}

export type Rejet = { stravaId: number; raison: string }

/** Types Strava suivis par le programme, et la discipline correspondante. */
const DISCIPLINES: Record<string, SessionKind> = {
  Run: 'run',
  TrailRun: 'run',
  VirtualRun: 'run',
  Swim: 'swim',
  WeightTraining: 'strength',
  Workout: 'strength',
  Crossfit: 'strength',
}

function isoDate(startDateLocal: string): ISODate {
  // Strava envoie l'heure locale de l'athlète : la date du jour est déjà la bonne.
  return startDateLocal.slice(0, 10)
}

function minutes(secondes: number): number {
  return Math.round((secondes / 60) * 10) / 10
}

/** RPE repris uniquement s'il est dans les bornes de l'échelle. */
function rpeAthlete(a: StravaActivity): number | null {
  const v = a.perceived_exertion
  if (typeof v !== 'number' || !Number.isFinite(v)) return null
  const arrondi = Math.round(v)
  return arrondi >= 1 && arrondi <= 10 ? arrondi : null
}

/**
 * Traduit une activité, ou explique pourquoi elle est écartée.
 * Rien n'est jamais écarté en silence : la raison remonte à l'écran.
 */
export function mapActivity(a: StravaActivity): ActiviteImportee | Rejet {
  const type = a.sport_type ?? a.type
  const kind = DISCIPLINES[type]
  if (!kind) return { stravaId: a.id, raison: `Type « ${type} » hors du programme.` }

  if (!Number.isFinite(a.moving_time) || a.moving_time <= 0) {
    return { stravaId: a.id, raison: 'Durée absente ou nulle.' }
  }

  const rpe = rpeAthlete(a)
  const aCompleter: string[] = []
  if (rpe === null) aCompleter.push('ressenti (RPE)')

  const duree = minutes(a.moving_time)
  const hr =
    typeof a.average_heartrate === 'number' && a.average_heartrate > 0
      ? Math.round(a.average_heartrate)
      : null

  let log: ActiviteImportee['log']

  if (kind === 'run') {
    log = {
      km: Math.round((a.distance / 1000) * 100) / 100,
      minutes: duree,
      hr,
      elev:
        typeof a.total_elevation_gain === 'number' ? Math.round(a.total_elevation_gain) : null,
    }
    if (hr === null) aCompleter.push('fréquence cardiaque')
  } else if (kind === 'swim') {
    log = {
      minutes: duree,
      distance: Math.round(a.distance),
      // Strava ne distingue pas le nagé en continu des longueurs entrecoupées,
      // et ne connaît pas la nage employée. Les déduire fausserait le repère
      // de natation, qui pèse 20 % du score.
      continuous: null,
      pauses: null,
      stroke: null,
      crawl: null,
    }
    aCompleter.push('mètres nagés en continu', 'nage employée')
  } else {
    log = {
      // Strava ne détaille ni séries ni répétitions sur une séance de force.
      minutes: duree,
    }
    aCompleter.push('séries et répétitions')
  }

  return {
    stravaId: a.id,
    date: isoDate(a.start_date_local),
    kind,
    title: a.name.trim() === '' ? 'Activité Strava' : a.name.trim(),
    minutes: duree,
    rpe,
    log,
    aCompleter,
  }
}

export function estRejet(r: ActiviteImportee | Rejet): r is Rejet {
  return 'raison' in r
}

/**
 * Choisit la séance prévue que l'activité vient renseigner : même jour, même
 * discipline, pas encore validée. Sans candidate, l'activité devient une
 * séance hors programme plutôt que d'écraser autre chose.
 */
export function matchSession<T extends { id: string; date: ISODate; kind: SessionKind; status: string }>(
  activite: ActiviteImportee,
  sessions: T[],
): T | null {
  const candidates = sessions.filter(
    (s) => s.date === activite.date && s.kind === activite.kind && s.status !== 'done',
  )
  return candidates[0] ?? null
}
