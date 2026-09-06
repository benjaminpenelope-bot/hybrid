import {
  bikeMinutes,
  buildStrength,
  doserPourObjectif,
  dureeLisible,
  kmDesCourses,
  microcycleDe,
  microcycleEffectif,
  swimTarget,
  weekVolume,
  RUN_KM_W1,
  type Slot,
} from './program'
import { baseDuProchainBloc, volumeHebdoReel } from './ancrage'
import { addDays } from './date'
import type { AthleteState, GoalType, ISODate, SessionType, Sport } from './types'

/**
 * PROJECTION
 *
 * Où le plan mène, annoncé le jour de l'inscription.
 *
 * Le premier jour est le moment où l'application est la moins convaincante :
 * le moteur n'a aucune donnée, donc le verdict dit honnêtement « je ne sais
 * pas comment tu te sens ». C'est juste, mais ça ne donne rien à quoi
 * s'accrocher.
 *
 * Cette projection comble ce creux sans rien inventer. Elle ne prédit aucune
 * performance : elle lit le plan déjà généré et annonce ce qu'il contiendra
 * dans douze semaines. La différence n'est pas rhétorique — une prédiction
 * pourrait être fausse, une lecture de plan ne peut pas l'être. D'où le
 * « si tu suis le plan » qui accompagne chaque jalon à l'écran.
 */

export interface Jalon {
  /** Ce qui progresse. */
  quoi: string
  /** Où le plan démarre. */
  depart: string
  /** Où il arrive. */
  arrivee: string
}

export interface OptionsProjection {
  sports: Sport[]
  goal?: GoalType | null
  baseKm?: number
  /** Horizon, en semaines. Douze : un cycle complet, trois décharges comprises. */
  semaines?: number
  /**
   * Semaine de départ dans le plan. Un athlète entamé n'est pas à la semaine
   * 1 : lui annoncer qu'il part de quinze kilomètres quand il en court trente
   * décrit le plan de quelqu'un d'autre.
   */
  semaineActuelle?: number
  /**
   * Plafond de volume hebdomadaire, en kilomètres. Indispensable dès que la
   * base est ancrée en cours de plan : elle n'est plus alors un volume, et le
   * plafond qui s'en déduirait mordrait dès la première semaine projetée.
   */
  plafondKm?: number
}

/**
 * Date à laquelle l'horizon est atteint.
 *
 * Une projection sans date se lit comme une promesse vague ; datée, elle
 * devient un rendez-vous. Douze semaines séparent le départ de l'arrivée,
 * donc onze intervalles de sept jours.
 */
export function dateDeLHorizon(depuis: ISODate, semaines = 12): ISODate {
  return addDays(depuis, 7 * (semaines - 1))
}

const TOUS: Slot[] = [0, 1, 2, 3, 4, 5, 6]

/*
 * Un volume s'ecrit « 50,5 km » et non « 50.5 km ». La regle vaut partout
 * dans l'application, et ce module produit deja des chaines destinees a
 * l'affichage : la formater ici evite d'avoir a la reparer a l'ecran.
 */
const km = (v: number): string => (Number.isInteger(v) ? `${v} km` : `${v.toFixed(1).replace('.', ',')} km`)

export function projection({
  sports,
  goal = null,
  baseKm = RUN_KM_W1,
  semaines = 12,
  semaineActuelle = 1,
  plafondKm,
}: OptionsProjection): Jalon[] {
  /*
   * Depart et arrivee sont deux numeros de semaine dans le meme plan, pas
   * deux plans. L'ecart vaut l'horizon moins un : de la semaine 8 a la
   * semaine 19, il y a bien douze semaines de programme.
   */
  const w0 = Math.max(1, Math.round(semaineActuelle))
  const w1 = w0 + semaines - 1
  const micro = microcycleEffectif(microcycleDe(goal), sports)
  const contient = (t: SessionType) => TOUS.some((s) => micro[s] === t)
  const jalons: Jalon[] = []

  /* ── Course ── */
  if (contient('LONG')) {
    const slot = TOUS.find((s) => micro[s] === 'LONG')!
    const d = kmDesCourses(w0, baseKm, micro, plafondKm).get(slot)
    const a = kmDesCourses(w1, baseKm, micro, plafondKm).get(slot)
    if (d && a) jalons.push({ quoi: 'Sortie longue', depart: km(d), arrivee: km(a) })
  }
  if (contient('RUN') || contient('LONG')) {
    jalons.push({
      quoi: 'Course par semaine',
      depart: km(weekVolume(w0, baseKm, plafondKm)),
      arrivee: km(weekVolume(w1, baseKm, plafondKm)),
    })
  }

  /* ── Vélo ── */
  if (contient('RIDE')) {
    jalons.push({
      quoi: 'Sortie longue vélo',
      depart: dureeLisible(Math.round((bikeMinutes(w0) * 1.5) / 5) * 5),
      arrivee: dureeLisible(Math.round((bikeMinutes(w1) * 1.5) / 5) * 5),
    })
  } else if (contient('BIKE')) {
    jalons.push({
      quoi: 'Sortie vélo',
      depart: dureeLisible(bikeMinutes(w0)),
      arrivee: dureeLisible(bikeMinutes(w1)),
    })
  }

  /* ── Natation ── */
  if (contient('SWIM')) {
    jalons.push({
      quoi: 'Nage sans pause',
      depart: `${swimTarget(w0).d} m`,
      arrivee: `${swimTarget(w1).d} m`,
    })
  }

  /* ── Force ── */
  if (contient('UPPER')) {
    /*
     * On lit la prescription reelle, dosage de l'objectif compris : projeter
     * des series qui ne seront pas celles du plan reviendrait a promettre
     * autre chose que ce qu'on livre.
     *
     * La semaine 1 est une semaine de test — que des maximums — donc on part
     * de la semaine 2, la premiere ou les series sont chiffrees.
     */
    const chiffres = (w: number) =>
      doserPourObjectif(buildStrength('UPPER', w), goal).filter(
        (e) => !e.test && /^\d/.test(e.reps),
      )
    const depart = chiffres(Math.max(2, w0))
    const arrivee = chiffres(Math.max(2, w1))
    // Deux exercices : assez pour que la progression se voie, assez peu pour
    // que la projection reste lisible d'un coup d'oeil.
    for (let i = 0; i < Math.min(2, depart.length, arrivee.length); i++) {
      jalons.push({
        quoi: `${depart[i]!.n} par série`,
        depart: depart[i]!.reps,
        arrivee: arrivee[i]!.reps,
      })
    }
  }

  return jalons
}

/* ────────────────────────────────────────────────────────────
 * PROJECTION D'UN ATHLÈTE RÉEL
 * ──────────────────────────────────────────────────────────── */

export interface ProjectionDatee {
  jalons: Jalon[]
  /** Semaine du plan où l'athlète se trouve aujourd'hui. */
  semaineActuelle: number
  semaineVisee: number
  /** Date à laquelle l'horizon est atteint. */
  quand: ISODate
  /**
   * `true` quand le départ vient de ce qui a été réellement couru, `false`
   * quand il vient encore du volume déclaré au questionnaire. La nuance
   * s'affiche : « d'après tes quatre dernières semaines » n'est pas la même
   * promesse que « d'après ce que tu as déclaré ».
   */
  ancree: boolean
}

/**
 * Où le plan mène, à partir d'où l'athlète en est réellement.
 *
 * Deux choses la séparent de `projection` : elle part de la semaine en cours
 * plutôt que de la semaine 1, et sa base est celle qu'on mesure plutôt que
 * celle qu'on a déclarée. Un athlète entamé lisait sinon la projection de
 * quelqu'un qui commence — ce qui, huit semaines plus tard, ne décrit plus
 * personne.
 */
export function projectionDeLAthlete(
  state: AthleteState,
  today: ISODate,
  semaines = 12,
): ProjectionDatee {
  const passees = state.sessions.filter((s) => s.date <= today)
  const semaineActuelle = passees.length > 0 ? Math.max(1, ...passees.map((s) => s.week)) : 1

  const reel = volumeHebdoReel(state, today)
  const { baseKm, mesuree } = baseDuProchainBloc(
    state,
    today,
    semaineActuelle,
    state.profile.baseWeeklyKm ?? null,
  )

  const jalons = projection({
    sports: (state.profile.sports ?? []) as Sport[],
    goal:
      (state.goals.find((g) => g.status === 'actif' && g.priority === 'principal')?.type as
        | GoalType
        | undefined) ?? null,
    semaines,
    semaineActuelle,
    ...(baseKm !== null ? { baseKm } : {}),
    // Le plafond suit la référence mesurée, jamais la base ancrée : voir
    // `weekVolume`, qui explique pourquoi les deux ne sont plus la même chose.
    ...(reel !== null ? { plafondKm: Math.min(reel * 3, 90) } : {}),
  })

  return {
    jalons,
    semaineActuelle,
    semaineVisee: semaineActuelle + semaines - 1,
    quand: dateDeLHorizon(today, semaines),
    ancree: mesuree,
  }
}
