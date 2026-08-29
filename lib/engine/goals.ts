import { addDays } from './date'
import { clamp, sum } from './math'
import { runStats, streetStats, swimStats } from './perf'
import { currentWeight } from './state'
import type {
  AthleteState,
  DeclaredGoal,
  GoalType,
  ISODate,
  StrengthBenchmarkKey,
} from './types'

/**
 * OBJECTIFS
 *
 * Les jalons affichés sont dérivés de l'objectif que l'athlète a déclaré, pas
 * d'une liste figée. Un compte qui vise un HYROX ne doit pas lire « Marathon
 * sous 4 h » : afficher un objectif que personne n'a fixé est une invention au
 * même titre qu'une performance inventée.
 *
 * Chaque jalon se mesure sur les données réelles. Quand la donnée manque, la
 * progression vaut `null` et non zéro : on ne sait pas, ce n'est pas la même
 * chose que rien.
 */

export type Horizon = '12 mois' | '6 mois' | '3 mois' | 'Cette semaine'

export interface Goal {
  horizon: Horizon
  label: string
  /** Où on en est, en clair. */
  current: string
  target: string
  /** 0 à 100, ou null quand la donnée n'est pas mesurée. */
  progress: number | null
}

/**
 * Ce sur quoi un jalon se mesure. Volontairement restreint à ce que
 * l'application enregistre réellement — pas de métrique qu'aucun écran ne
 * permet de renseigner.
 */
type Metrique =
  /** Plus longue sortie course, en km. */
  | { m: 'course_longue' }
  /** Kilomètres courus sur sept jours. */
  | { m: 'course_semaine' }
  /** Distance nagée sans pause, en mètres. */
  | { m: 'nage_continue' }
  /** Repère de force, en répétitions. */
  | { m: 'repere'; key: StrengthBenchmarkKey }
  /**
   * Exigence réelle de l'objectif que l'app ne sait pas mesurer. Affichée
   * quand même : masquer un trou le rend invisible, l'afficher dit à
   * l'athlète ce que le suivi ne couvre pas.
   */
  | { m: 'non_mesure'; pourquoi: string }

interface Jalon {
  horizon: Horizon
  label: string
  cible: number
  metrique: Metrique
}

/**
 * Jalons par type d'objectif.
 *
 * Ce sont des paliers d'entraînement, pas des performances relevées : ils
 * disent où viser, la mesure vient toujours des séances enregistrées. Les
 * chiffres sont choisis pour être franchissables dans l'horizon annoncé et
 * mesurables avec ce que l'app enregistre.
 */
const JALONS: Record<GoalType, Jalon[]> = {
  marathon: [
    { horizon: '12 mois', label: 'Marathon — 42,2 km', cible: 42.2, metrique: { m: 'course_longue' } },
    { horizon: '6 mois', label: 'Sortie longue de 25 km', cible: 25, metrique: { m: 'course_longue' } },
    { horizon: '3 mois', label: '40 km de course par semaine', cible: 40, metrique: { m: 'course_semaine' } },
  ],
  semi: [
    { horizon: '12 mois', label: 'Semi-marathon — 21,1 km', cible: 21.1, metrique: { m: 'course_longue' } },
    { horizon: '6 mois', label: 'Sortie longue de 15 km', cible: 15, metrique: { m: 'course_longue' } },
    { horizon: '3 mois', label: '30 km de course par semaine', cible: 30, metrique: { m: 'course_semaine' } },
  ],
  dix_km: [
    { horizon: '6 mois', label: '10 km d’une traite', cible: 10, metrique: { m: 'course_longue' } },
    { horizon: '3 mois', label: '20 km de course par semaine', cible: 20, metrique: { m: 'course_semaine' } },
  ],
  hyrox: [
    /*
     * Un HYROX, c'est 8 km de course fractionnes en huit portions, entre huit
     * ateliers. La course se mesure ici ; les ateliers, non — d'ou le jalon
     * explicitement non mesure plutot qu'un silence.
     */
    { horizon: '12 mois', label: 'Courir 8 km d’une traite', cible: 8, metrique: { m: 'course_longue' } },
    { horizon: '6 mois', label: '30 km de course par semaine', cible: 30, metrique: { m: 'course_semaine' } },
    { horizon: '6 mois', label: '60 squats d’affilée', cible: 60, metrique: { m: 'repere', key: 'squats' } },
    { horizon: '3 mois', label: '40 pompes d’affilée', cible: 40, metrique: { m: 'repere', key: 'pushups' } },
    {
      horizon: '6 mois',
      label: 'Ateliers HYROX — traîneau, rameur, ski erg',
      cible: 0,
      metrique: {
        m: 'non_mesure',
        pourquoi: 'aucun écran ne permet de les enregistrer pour l’instant',
      },
    },
  ],
  force: [
    { horizon: '12 mois', label: '15 tractions strictes', cible: 15, metrique: { m: 'repere', key: 'pullups' } },
    { horizon: '6 mois', label: '25 dips', cible: 25, metrique: { m: 'repere', key: 'dips' } },
    { horizon: '3 mois', label: '8 tractions strictes', cible: 8, metrique: { m: 'repere', key: 'pullups' } },
  ],
  hypertrophie: [
    { horizon: '6 mois', label: '20 tractions strictes', cible: 20, metrique: { m: 'repere', key: 'pullups' } },
    { horizon: '3 mois', label: '30 dips', cible: 30, metrique: { m: 'repere', key: 'dips' } },
  ],
  street_workout: [
    { horizon: '12 mois', label: '5 muscle-ups consécutifs', cible: 5, metrique: { m: 'repere', key: 'muscleups' } },
    { horizon: '6 mois', label: '15 tractions strictes', cible: 15, metrique: { m: 'repere', key: 'pullups' } },
    { horizon: '3 mois', label: '20 relevés de jambes', cible: 20, metrique: { m: 'repere', key: 'legraises' } },
  ],
  endurance: [
    { horizon: '12 mois', label: 'Sortie longue de 25 km', cible: 25, metrique: { m: 'course_longue' } },
    { horizon: '6 mois', label: '1 500 m nagés sans pause', cible: 1500, metrique: { m: 'nage_continue' } },
    { horizon: '3 mois', label: '30 km de course par semaine', cible: 30, metrique: { m: 'course_semaine' } },
  ],
  hybride: [
    { horizon: '12 mois', label: 'Marathon — 42,2 km', cible: 42.2, metrique: { m: 'course_longue' } },
    { horizon: '12 mois', label: '1 500 m nagés sans pause', cible: 1500, metrique: { m: 'nage_continue' } },
    { horizon: '6 mois', label: '15 tractions strictes', cible: 15, metrique: { m: 'repere', key: 'pullups' } },
    { horizon: '6 mois', label: 'Sortie longue de 25 km', cible: 25, metrique: { m: 'course_longue' } },
    { horizon: '3 mois', label: '5 muscle-ups consécutifs', cible: 5, metrique: { m: 'repere', key: 'muscleups' } },
    { horizon: '3 mois', label: '400 m nagés sans pause', cible: 400, metrique: { m: 'nage_continue' } },
  ],
}

/** Nom lisible d'un type d'objectif, tel qu'il a été proposé à l'inscription. */
export const LIBELLE_OBJECTIF: Record<GoalType, string> = {
  marathon: 'Marathon',
  semi: 'Semi-marathon',
  dix_km: '10 km',
  hyrox: 'HYROX',
  force: 'Force',
  hypertrophie: 'Hypertrophie',
  street_workout: 'Street workout',
  endurance: 'Endurance',
  hybride: 'Hybride',
}

/** Objectifs actifs, le principal d'abord. */
export function objectifsActifs(state: AthleteState): DeclaredGoal[] {
  return state.goals
    .filter((g) => g.status === 'actif')
    .sort((a, b) => (a.priority === 'principal' ? -1 : b.priority === 'principal' ? 1 : 0))
}

/** Limitations en cours à la date donnée. Une limitation close est un antécédent. */
export function limitationsActives(state: AthleteState, today: ISODate) {
  return state.limitations.filter((l) => l.startedOn <= today && (l.endedOn === null || l.endedOn >= today))
}

/**
 * Nombre a la francaise : virgule decimale, espace fine insecable pour les
 * milliers. Sans ca, une meme ligne affichait « 10.2 km · objectif 42,2 km ».
 */
function nombre(v: number, decimales = 1): string {
  const arrondi = Number.isInteger(v) ? `${v}` : v.toFixed(decimales)
  const [entier, dec] = arrondi.split('.')
  const groupe = entier!.replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f')
  return dec ? `${groupe},${dec}` : groupe
}

/** Traduit un jalon en objectif affichable, sur les données réelles. */
function mesurer(jalon: Jalon, state: AthleteState, today: ISODate): Goal {
  const { horizon, label, cible, metrique } = jalon

  switch (metrique.m) {
    case 'non_mesure':
      return {
        horizon,
        label,
        current: `non suivi — ${metrique.pourquoi}`,
        target: 'à mesurer ailleurs',
        progress: null,
      }

    case 'course_longue': {
      const longest = runStats(state, today).longest
      return {
        horizon,
        label,
        current: longest === null ? 'aucune sortie mesurée' : `${nombre(longest)} km`,
        target: `${nombre(cible)} km`,
        progress: longest === null ? null : clamp((longest / cible) * 100),
      }
    }

    case 'course_semaine': {
      // Zero kilometre est une mesure, pas une absence : la progression existe.
      const km7 = runStats(state, today).km7
      return {
        horizon,
        label,
        current: `${nombre(km7)} km`,
        target: `${nombre(cible)} km`,
        progress: clamp((km7 / cible) * 100),
      }
    }

    case 'nage_continue': {
      const continuous = swimStats(state, today).continuous
      return {
        horizon,
        label,
        current: continuous === null ? 'à mesurer' : `${nombre(continuous)} m`,
        target: `${nombre(cible)} m`,
        /*
         * Echelle logarithmique : passer de 25 a 50 m coute autant d'efforts
         * que de 750 a 1 500 m. Une echelle lineaire ecraserait tout le debut
         * de la progression a quelques pourcents.
         */
        progress:
          continuous === null || continuous <= 0
            ? null
            : clamp((Math.log(continuous / 25) / Math.log(cible / 25)) * 100),
      }
    }

    case 'repere': {
      const carte = streetStats(state, today).cards.find((c) => c.key === metrique.key)
      const valeur = carte?.value ?? null
      return {
        horizon,
        label,
        current: valeur === null ? 'À TESTER' : `${valeur}`,
        target: `${nombre(cible)}`,
        progress: valeur === null ? null : clamp((valeur / cible) * 100),
      }
    }
  }
}

/**
 * Jalons universels : ils ne dépendent d'aucun objectif déclaré parce qu'ils
 * viennent du profil et du plan, que l'athlète vise un marathon ou un HYROX.
 */
function jalonsUniversels(state: AthleteState, today: ISODate): Goal[] {
  const weight = currentWeight(state)
  const { goalWeight, startWeight } = state.profile

  const semaine = state.sessions.filter((s) => s.date >= addDays(today, -6) && s.date <= today)
  const faites = semaine.filter((s) => s.status === 'done').length
  const prevues = semaine.filter((s) => s.type !== 'REST').length
  const kmSemaine = sum(semaine.filter((s) => s.status === 'done').map((s) => s.log?.km ?? 0))
  const base = state.profile.baseWeeklyKm ?? 15

  const out: Goal[] = []

  // Un poids cible egal au poids de depart n'est pas un objectif.
  if (goalWeight !== startWeight) {
    out.push({
      horizon: '12 mois',
      label: `${goalWeight} kg`,
      current: `${nombre(weight)} kg`,
      target: `${goalWeight} kg`,
      progress: clamp(((weight - startWeight) / (goalWeight - startWeight)) * 100),
    })
  }

  out.push({
    horizon: 'Cette semaine',
    label: 'Séances réalisées',
    current: `${faites}`,
    target: `${prevues}`,
    progress: prevues > 0 ? clamp((faites / prevues) * 100) : null,
  })

  out.push({
    horizon: 'Cette semaine',
    label: 'Kilomètres courus',
    current: `${nombre(kmSemaine)} km`,
    target: `${nombre(base)} km`,
    progress: clamp((kmSemaine / base) * 100),
  })

  return out
}

export function computeGoals(state: AthleteState, today: ISODate): Goal[] {
  const declares = objectifsActifs(state)

  /*
   * Deux objectifs peuvent partager un jalon — courir et viser l'hybride
   * demandent tous deux une sortie longue. On garde la premiere occurrence,
   * donc celle de l'objectif principal.
   */
  const vus = new Set<string>()
  const derives: Goal[] = []
  for (const d of declares) {
    for (const jalon of JALONS[d.type]) {
      if (vus.has(jalon.label)) continue
      vus.add(jalon.label)
      derives.push(mesurer(jalon, state, today))
    }
  }

  return [...derives, ...jalonsUniversels(state, today)]
}

export const HORIZONS: Horizon[] = ['Cette semaine', '3 mois', '6 mois', '12 mois']
