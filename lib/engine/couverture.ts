import { LIBELLE_OBJECTIF } from './goals'
import type { AthleteState, GoalType, Sport } from './types'

/**
 * CE QUE LE PROGRAMME NE PEUT PAS FAIRE, DIT À VOIX HAUTE
 *
 * Un objectif suppose des disciplines. La perte de poids suppose de la
 * force — non pour construire, mais pour garder : perdre du poids sans
 * toucher à la barre, c'est perdre du muscle en même temps que le gras. Un
 * marathon suppose de courir.
 *
 * Quand l'athlète n'a pas déclaré une de ces disciplines, le générateur
 * substitue et le programme se construit quand même. Il tient debout, mais
 * il ne tient plus sa promesse : une perte de poids sans barre devient un
 * plan de cardio, et rien ne le disait.
 *
 * C'est le défaut qu'on répare ici, et il est de la même famille que tous
 * les autres de cette application : ne jamais laisser croire. Le programme
 * fait ce qu'il peut avec ce qu'on lui a déclaré, et il annonce le reste.
 *
 * Seul l'ESSENTIEL est déclaré ci-dessous. La répartition d'un marathon
 * contient de la natation, mais un marathon ne se perd pas faute de nager :
 * signaler chaque discipline absente d'une répartition ferait du bruit là
 * où il faut un avertissement.
 */

export interface Manque {
  /** Ce qui manque, en clair. */
  quoi: string
  /** Ce que son absence coûte à l'objectif. */
  consequence: string
}

interface Exigence {
  /** L'une de ces disciplines suffit. */
  sports: Sport[]
  quoi: string
  consequence: string
}

const FORCE: Exigence = {
  sports: ['strength', 'street_workout'],
  quoi: 'de la force',
  consequence:
    'Sans barre, la perte se fait aussi sur le muscle : c’est elle qui le protège pendant que le poids descend.',
}

const COURSE: Exigence = {
  sports: ['running'],
  quoi: 'la course',
  consequence: 'C’est la discipline de l’épreuve : sans elle, le programme ne prépare pas la course.',
}

const EXIGENCES: Partial<Record<GoalType, Exigence[]>> = {
  perte_de_poids: [FORCE],
  prise_de_masse: [
    {
      ...FORCE,
      consequence:
        'C’est la barre qui fait grossir le muscle. Sans elle, le poids peut monter, mais pas de la masse utile.',
    },
  ],
  hypertrophie: [
    {
      ...FORCE,
      consequence: 'Aucune autre discipline ne fait grossir un muscle. Sans barre, l’objectif n’a pas de levier.',
    },
  ],
  force: [
    {
      ...FORCE,
      consequence: 'Gagner en force demande de la charge. Rien d’autre ne s’y substitue.',
    },
  ],
  street_workout: [
    {
      sports: ['street_workout'],
      quoi: 'le street workout',
      consequence: 'Les figures se travaillent à la barre, et nulle part ailleurs.',
    },
  ],
  marathon: [COURSE],
  semi: [COURSE],
  dix_km: [COURSE],
  hyrox: [
    COURSE,
    {
      ...FORCE,
      consequence:
        'Cinq des huit ateliers sollicitent surtout les jambes. Sans force, le programme n’en prépare aucun.',
    },
  ],
}

/**
 * Ce que l'objectif principal réclame et que l'athlète n'a pas déclaré.
 *
 * Vide quand tout y est — et vide aussi quand aucun sport n'est déclaré :
 * un tableau vide veut dire « on ne sait pas », et reprocher à quelqu'un de
 * n'avoir rien coché n'aide personne. C'est la même règle que partout, une
 * absence de mesure n'est pas un zéro.
 */
export function manquesDuProgramme(state: AthleteState): Manque[] {
  const sports = state.profile.sports ?? []
  if (sports.length === 0) return []

  const objectif = state.goals.find((g) => g.status === 'actif' && g.priority === 'principal')
  if (!objectif) return []

  return (EXIGENCES[objectif.type] ?? [])
    .filter((e) => !e.sports.some((s) => sports.includes(s)))
    .map((e) => ({ quoi: e.quoi, consequence: e.consequence }))
}

/** Nom de l'objectif principal, pour composer la phrase. Null s'il n'y en a pas. */
export function objectifPrincipal(state: AthleteState): string | null {
  const g = state.goals.find((x) => x.status === 'actif' && x.priority === 'principal')
  return g ? LIBELLE_OBJECTIF[g.type] : null
}
