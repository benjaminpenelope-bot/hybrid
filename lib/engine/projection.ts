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
import type { GoalType, SessionType, Sport } from './types'

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
}: OptionsProjection): Jalon[] {
  const micro = microcycleEffectif(microcycleDe(goal), sports)
  const contient = (t: SessionType) => TOUS.some((s) => micro[s] === t)
  const jalons: Jalon[] = []

  /* ── Course ── */
  if (contient('LONG')) {
    const slot = TOUS.find((s) => micro[s] === 'LONG')!
    const d = kmDesCourses(1, baseKm, micro).get(slot)
    const a = kmDesCourses(semaines, baseKm, micro).get(slot)
    if (d && a) jalons.push({ quoi: 'Sortie longue', depart: km(d), arrivee: km(a) })
  }
  if (contient('RUN') || contient('LONG')) {
    jalons.push({
      quoi: 'Course par semaine',
      depart: km(weekVolume(1, baseKm)),
      arrivee: km(weekVolume(semaines, baseKm)),
    })
  }

  /* ── Vélo ── */
  if (contient('RIDE')) {
    jalons.push({
      quoi: 'Sortie longue vélo',
      depart: dureeLisible(Math.round((bikeMinutes(1) * 1.5) / 5) * 5),
      arrivee: dureeLisible(Math.round((bikeMinutes(semaines) * 1.5) / 5) * 5),
    })
  } else if (contient('BIKE')) {
    jalons.push({
      quoi: 'Sortie vélo',
      depart: dureeLisible(bikeMinutes(1)),
      arrivee: dureeLisible(bikeMinutes(semaines)),
    })
  }

  /* ── Natation ── */
  if (contient('SWIM')) {
    jalons.push({
      quoi: 'Nage sans pause',
      depart: `${swimTarget(1).d} m`,
      arrivee: `${swimTarget(semaines).d} m`,
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
    const depart = chiffres(2)
    const arrivee = chiffres(semaines)
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
