import { baseDuProchainBloc, volumeHebdoReel } from './ancrage'
import { addDays, mondayOf } from './date'
import { sum } from './math'
import {
  facteurDePlafond,
  kmDesCourses,
  microcycleDe,
  microcycleEffectif,
  weekVolume,
  isDeloadWeek,
  PLAFOND_KM,
  type Slot,
} from './program'
import type { AthleteState, GoalType, ISODate, Sport } from './types'

/**
 * TRAJECTOIRE
 *
 * Une seule courbe, du passé mesuré vers l'avenir prescrit.
 *
 * Les deux moitiés existaient déjà, séparément : l'historique dans les
 * graphiques du bilan, la projection dans une liste de « départ → arrivée ».
 * Séparées, elles ne disaient rien. C'est leur jointure qui porte le sens —
 * on ne se motive pas devant un chiffre d'arrivée, on se motive en voyant sa
 * propre pente continuer.
 *
 * RIEN N'EST PRÉDIT ICI. La partie gauche est la somme des kilomètres
 * réellement enregistrés, semaine par semaine. La partie droite est la
 * lecture du plan déjà généré, ancré sur ces mêmes kilomètres. Une prédiction
 * pourrait être fausse ; une lecture de plan ne peut pas l'être, et c'est
 * exactement ce qui autorise à l'afficher aussi grand.
 */

export interface SemaineTrajectoire {
  /** Numéro de la semaine dans le plan. */
  semaine: number
  lundi: ISODate
  km: number
  /** `true` quand la valeur vient des séances enregistrées. */
  reel: boolean
  /** Semaine de décharge : le creux est voulu, il n'est pas un relâchement. */
  decharge: boolean
  /** Sortie longue de la semaine, en km. `null` quand la semaine n'en a pas. */
  longue: number | null
}

/** Distances qui font date quand une sortie longue les atteint. */
export const PALIERS_KM = [5, 10, 15, 21.1, 30, 42.2] as const

export interface Palier {
  km: number
  /** Nom de la distance, quand elle en a un. */
  nom: string | null
  quand: ISODate
  semaine: number
}

export interface Trajectoire {
  points: SemaineTrajectoire[]
  /** Index du premier point projeté. Tout ce qui précède est mesuré. */
  bascule: number
  semaineActuelle: number
  /** `true` quand la projection part du volume mesuré et non du déclaré. */
  ancree: boolean
  /** Kilomètres que le plan fait courir entre aujourd'hui et l'horizon. */
  kmAVenir: number
  /** Volume de la dernière semaine projetée. */
  arrivee: number
  /** Volume de la semaine en cours, tel que le plan la prescrit. */
  depart: number
  /**
   * Volume hebdomadaire réellement couru sur quatre semaines. `null` quand
   * l'historique est trop mince pour le dire.
   *
   * C'est lui, et non `depart`, qui sert de point de comparaison à l'écran.
   * Une semaine sur quatre est une décharge : comparer l'arrivée au départ
   * tombait une fois sur quatre sur un creux voulu, et annonçait alors une
   * progression de deux cent trente pour cent là où il y en avait cent
   * trente. Un chiffre juste par construction mais faux par cadrage reste
   * un chiffre faux.
   */
  reelHebdo: number | null
  /** Date de la dernière semaine projetée. */
  quand: ISODate
  paliers: Palier[]
}

const NOMS: Record<number, string> = {
  10: '10 km',
  21.1: 'semi-marathon',
  42.2: 'marathon',
}

const TOUS: Slot[] = [0, 1, 2, 3, 4, 5, 6]

/** Kilomètres réellement courus la semaine du lundi donné. */
function kmDeLaSemaine(state: AthleteState, lundi: ISODate): number {
  const fin = addDays(lundi, 6)
  const faites = state.sessions.filter(
    (s) => s.status === 'done' && s.date >= lundi && s.date <= fin,
  )
  return Math.round(sum(faites.map((s) => s.log?.km ?? 0)) * 10) / 10
}

export interface OptionsTrajectoire {
  /** Semaines de passé affichées. */
  avant?: number
  /** Semaines projetées, à partir de la semaine en cours. */
  apres?: number
}

export function trajectoire(
  state: AthleteState,
  today: ISODate,
  { avant = 8, apres = 12 }: OptionsTrajectoire = {},
): Trajectoire {
  const objectif =
    (state.goals.find((g) => g.status === 'actif' && g.priority === 'principal')?.type as
      | GoalType
      | undefined) ?? null
  const micro = microcycleEffectif(
    microcycleDe(objectif),
    (state.profile.sports ?? []) as Sport[],
    state.profile.allowDoubles ?? false,
  )
  const slotLong = TOUS.find((s) => micro[s] === 'LONG') ?? null

  const passees = state.sessions.filter((s) => s.date <= today)
  const semaineActuelle = passees.length > 0 ? Math.max(1, ...passees.map((s) => s.week)) : 1

  const reel = volumeHebdoReel(state, today)
  const { baseKm, mesuree } = baseDuProchainBloc(
    state,
    today,
    semaineActuelle,
    state.profile.baseWeeklyKm ?? null,
  )
  const base = baseKm ?? 15
  const plafond =
    reel === null ? undefined : Math.min(reel * facteurDePlafond(objectif), PLAFOND_KM)

  const lundiCourant = mondayOf(today)

  /*
   * La premiere seance enregistree borne le passe : avant elle, l'application
   * n'observait rien, et tracer zero ferait croire a des semaines sans
   * entrainement plutot qu'a une absence de compte.
   */
  const premiere = state.sessions.map((s) => s.date).sort()[0] ?? today
  const points: SemaineTrajectoire[] = []

  for (let i = avant; i >= 1; i--) {
    const lundi = addDays(lundiCourant, -7 * i)
    if (addDays(lundi, 6) < premiere) continue
    points.push({
      semaine: semaineActuelle - i,
      lundi,
      km: kmDeLaSemaine(state, lundi),
      reel: true,
      decharge: isDeloadWeek(semaineActuelle - i),
      longue: null,
    })
  }

  const bascule = points.length

  /*
   * La semaine en cours ouvre la partie projetee : elle n'est pas finie, donc
   * la compter comme mesuree afficherait un creux qui n'est que du temps
   * restant. C'est le meme principe que le bilan, qui ne juge jamais une
   * semaine qu'on est en train de vivre.
   */
  for (let i = 0; i < apres; i++) {
    const w = semaineActuelle + i
    const lundi = addDays(lundiCourant, 7 * i)
    const parSortie = kmDesCourses(w, base, micro, plafond)
    points.push({
      semaine: w,
      lundi,
      km: weekVolume(w, base, plafond),
      reel: false,
      decharge: isDeloadWeek(w),
      longue: slotLong === null ? null : (parSortie.get(slotLong) ?? null),
    })
  }

  const futurs = points.slice(bascule)
  const dernier = points[points.length - 1]

  /*
   * Les paliers ne se declarent atteints qu'a partir de la premiere semaine
   * ou le plan les depasse — et seulement ceux qui restent devant. Annoncer
   * « le plan atteint 10 km » a qui en court deja quinze n'est pas une
   * nouvelle, c'est du bruit.
   */
  const longueActuelle = futurs[0]?.longue ?? 0
  const paliers: Palier[] = []
  for (const cible of PALIERS_KM) {
    if (cible <= longueActuelle) continue
    const atteint = futurs.find((p) => (p.longue ?? 0) >= cible)
    if (!atteint) continue
    paliers.push({
      km: cible,
      nom: NOMS[cible] ?? null,
      quand: atteint.lundi,
      semaine: atteint.semaine,
    })
  }

  return {
    points,
    bascule,
    semaineActuelle,
    ancree: mesuree,
    kmAVenir: Math.round(sum(futurs.map((p) => p.km))),
    depart: futurs[0]?.km ?? 0,
    reelHebdo: reel,
    arrivee: dernier?.km ?? 0,
    quand: dernier?.lundi ?? today,
    paliers,
  }
}

/**
 * Réduit une trajectoire à un horizon plus court.
 *
 * Le volume d'une semaine ne dépend pas de l'horizon qu'on regarde : la
 * semaine 30 vaut la même chose qu'on projette à trois mois ou à un an. On
 * calcule donc une seule fois, au plus long, et changer d'horizon devient une
 * découpe — instantanée, sans aller-retour au serveur, et sans qu'un même
 * chiffre puisse différer d'une vue à l'autre.
 */
export function surHorizon(t: Trajectoire, apres: number): Trajectoire {
  const points = t.points.slice(0, t.bascule + Math.max(1, apres))
  const futurs = points.slice(t.bascule)
  const dernier = points[points.length - 1]
  const longueActuelle = futurs[0]?.longue ?? 0

  const paliers = t.paliers.filter(
    (p) => p.km > longueActuelle && futurs.some((f) => f.semaine === p.semaine),
  )

  return {
    ...t,
    points,
    kmAVenir: Math.round(sum(futurs.map((p) => p.km))),
    depart: futurs[0]?.km ?? 0,
    arrivee: dernier?.km ?? 0,
    quand: dernier?.lundi ?? t.quand,
    paliers,
  }
}
