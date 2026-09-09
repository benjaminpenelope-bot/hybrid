import { baseDuProchainBloc, volumeHebdoReel } from './ancrage'
import { addDays, mondayOf } from './date'
import { sum } from './math'
import { reperesDepuisLignes } from './force'
import {
  buildStrength,
  doserPourObjectif,
  facteurDePlafond,
  kmDesCourses,
  microcycleDe,
  microcycleEffectif,
  swimLadder,
  swimTarget,
  weekVolume,
  isDeloadWeek,
  PLAFOND_KM,
  type Slot,
} from './program'
import type { AthleteState, GoalType, ISODate, Sport } from './types'

export type Discipline = 'course' | 'natation' | 'force'

export interface MetaDiscipline {
  label: string
  unite: string
  couleur: string
  /** Ce que la courbe mesure, dit en clair. */
  mesure: string
  /** Ce que le cumul totalise, ou `null` quand il n'a pas de sens. */
  cumul: string | null
}

/**
 * CE QUE CHAQUE DISCIPLINE PEUT PROJETER
 *
 * Une seule règle décide : on ne trace que ce que le plan prescrit
 * réellement, semaine par semaine.
 *
 * En course, c'est le volume hebdomadaire — il est calculé pour chaque
 * semaine du plan. En natation, c'est la distance nagée sans pause : l'échelle
 * de paliers est écrite dans le programme et avance toutes les trois
 * semaines. En force, c'est le volume de répétitions prescrit.
 *
 * Ce qui n'est pas prescrit n'est pas projeté. Le total nagé par semaine, par
 * exemple, n'apparaît nulle part dans le plan : il se mesure mais ne se
 * projette pas, et une courbe qui l'annoncerait inventerait sa moitié droite.
 */
export const DISCIPLINES: Record<Discipline, MetaDiscipline> = {
  course: {
    label: 'Course',
    unite: 'km',
    couleur: 'var(--run)',
    mesure: 'kilomètres par semaine',
    cumul: 'kilomètres à courir',
  },
  natation: {
    label: 'Natation',
    unite: 'm',
    couleur: 'var(--swim)',
    mesure: 'mètres nagés sans pause',
    // Additionner des distances continues d'une semaine sur l'autre ne
    // voudrait rien dire : ce n'est pas un volume, c'est un palier.
    cumul: null,
  },
  force: {
    label: 'Force',
    unite: 'reps',
    couleur: 'var(--street)',
    /*
     * « par semaine » et non « prescrites par semaine » : l'ecran des perfs
     * emploie ce meme libelle sur une courbe entierement mesuree, ou le mot
     * « prescrites » serait faux. La distinction entre ce qui est mesure et
     * ce qui est prescrit se lit sur le trait, pas dans le titre.
     */
    mesure: 'répétitions par semaine',
    cumul: 'répétitions à faire',
  },
}

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
  /** Valeur de la semaine, dans l'unité de la discipline. */
  valeur: number
  /** `true` quand la valeur vient des séances enregistrées. */
  reel: boolean
  /** Semaine de décharge : le creux est voulu, il n'est pas un relâchement. */
  decharge: boolean
  /**
   * Repère qui sert aux rendez-vous : la sortie longue en course, la distance
   * continue en natation. `null` quand la discipline n'en a pas.
   */
  repere: number | null
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
  discipline: Discipline
  points: SemaineTrajectoire[]
  /** Index du premier point projeté. Tout ce qui précède est mesuré. */
  bascule: number
  semaineActuelle: number
  /** `true` quand la projection part du volume mesuré et non du déclaré. */
  ancree: boolean
  /**
   * Ce que le plan totalise d'ici l'horizon, quand le total a un sens.
   * `null` en natation : additionner des distances continues d'une semaine
   * sur l'autre ne donnerait pas un volume, seulement un nombre.
   */
  cumulAVenir: number | null
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

/** Séances effectivement faites dans la semaine du lundi donné. */
function faitesDansLaSemaine(state: AthleteState, lundi: ISODate) {
  const fin = addDays(lundi, 6)
  return state.sessions.filter((s) => s.status === 'done' && s.date >= lundi && s.date <= fin)
}

/**
 * Bas de la fourchette prescrite, en répétitions.
 *
 * Le bas et non le milieu : la prescription dit « 7–10 », et compter dix
 * reviendrait à supposer que chaque série est menée au maximum. Une durée de
 * gainage est écartée — ce sont des secondes, pas des répétitions — et un
 * exercice unilatéral compte double, puisque « 10 / jambe » en fait vingt.
 */
export function repsPrescrites(reps: string, unit?: string): number {
  if (unit === 's') return 0
  const texte = reps.trim()
  if (/amrap|max|%/i.test(texte)) return 0
  const m = texte.match(/^(\d+)/)
  if (!m) return 0
  const n = Number(m[1])
  return /\/\s*jambe/i.test(texte) ? n * 2 : n
}

export interface OptionsTrajectoire {
  /** Semaines de passé affichées. */
  avant?: number
  /** Semaines projetées, à partir de la semaine en cours. */
  apres?: number
  discipline?: Discipline
}

export function trajectoire(
  state: AthleteState,
  today: ISODate,
  { avant = 8, apres = 12, discipline = 'course' }: OptionsTrajectoire = {},
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
  const slotsForce = TOUS.filter((s) => micro[s] === 'UPPER' || micro[s] === 'LOWER')

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

  const reperes = reperesDepuisLignes(
    Object.entries(state.benchmarks)
      .filter(([, b]) => b != null)
      .map(([key, b]) => ({ key, value: b!.value, tested_at: b!.testedAt })),
  )
  const materiel = state.profile.equipment

  /** Ce qui a été mesuré cette semaine-là, dans l'unité de la discipline. */
  const mesure = (lundi: ISODate): number => {
    const faites = faitesDansLaSemaine(state, lundi)
    if (discipline === 'course') {
      return Math.round(sum(faites.map((s) => s.log?.km ?? 0)) * 10) / 10
    }
    if (discipline === 'natation') {
      // La meilleure distance enchainee de la semaine, et non leur somme :
      // c'est un palier, il ne s'additionne pas.
      const continues = faites.map((s) => s.log?.continuous ?? 0)
      return continues.length > 0 ? Math.max(0, ...continues) : 0
    }
    return sum(faites.map((s) => s.log?.reps ?? 0))
  }

  /** Ce que le plan prescrit pour la semaine `w`. */
  const prescrit = (w: number): number => {
    if (discipline === 'course') return weekVolume(w, base, plafond)
    if (discipline === 'natation') return swimTarget(w).d
    return sum(
      slotsForce.map((slot) =>
        sum(
          doserPourObjectif(
            buildStrength(micro[slot] as 'UPPER' | 'LOWER', w, reperes, 1, materiel),
            objectif,
          ).map((e) => e.sets * repsPrescrites(e.reps, e.unit)),
        ),
      ),
    )
  }

  /** Le repère sur lequel se datent les rendez-vous. */
  const repereDe = (w: number): number | null => {
    if (discipline === 'course') {
      return slotLong === null ? null : (kmDesCourses(w, base, micro, plafond).get(slotLong) ?? null)
    }
    if (discipline === 'natation') return swimTarget(w).d
    return null
  }

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
      valeur: mesure(lundi),
      reel: true,
      decharge: isDeloadWeek(semaineActuelle - i),
      repere: null,
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
    points.push({
      semaine: w,
      lundi: addDays(lundiCourant, 7 * i),
      valeur: prescrit(w),
      reel: false,
      decharge: discipline === 'course' && isDeloadWeek(w),
      repere: repereDe(w),
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
  const cibles: number[] =
    discipline === 'course'
      ? [...PALIERS_KM]
      : discipline === 'natation'
        ? swimLadder().map((r) => r.d)
        : []
  const actuel = futurs[0]?.repere ?? 0
  const paliers: Palier[] = []
  for (const cible of cibles) {
    if (cible <= actuel) continue
    const atteint = futurs.find((p) => (p.repere ?? 0) >= cible)
    if (!atteint) continue
    paliers.push({
      km: cible,
      nom: discipline === 'course' ? (NOMS[cible] ?? null) : null,
      quand: atteint.lundi,
      semaine: atteint.semaine,
    })
  }

  return {
    discipline,
    points,
    bascule,
    semaineActuelle,
    ancree: discipline === 'course' ? mesuree : true,
    cumulAVenir:
      DISCIPLINES[discipline].cumul === null
        ? null
        : Math.round(sum(futurs.map((p) => p.valeur))),
    depart: futurs[0]?.valeur ?? 0,
    reelHebdo: discipline === 'course' ? reel : null,
    arrivee: dernier?.valeur ?? 0,
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
  const actuel = futurs[0]?.repere ?? 0

  const paliers = t.paliers.filter(
    (p) => p.km > actuel && futurs.some((f) => f.semaine === p.semaine),
  )

  return {
    ...t,
    points,
    cumulAVenir:
      t.cumulAVenir === null ? null : Math.round(sum(futurs.map((p) => p.valeur))),
    depart: futurs[0]?.valeur ?? 0,
    arrivee: dernier?.valeur ?? 0,
    quand: dernier?.lundi ?? t.quand,
    paliers,
  }
}
