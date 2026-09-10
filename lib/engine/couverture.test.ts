import { describe, expect, it } from 'vitest'
import { manquesDuProgramme } from './couverture'
import { microcycleDe, microcycleEffectif, typePraticable } from './program'
import type { AthleteState, GoalType, SessionType, Sport } from './types'

const OBJECTIFS: GoalType[] = [
  'marathon', 'semi', 'dix_km', 'hyrox', 'force', 'hypertrophie',
  'street_workout', 'endurance', 'hybride', 'perte_de_poids', 'prise_de_masse',
]

const SPORTS: Sport[] = ['running', 'cycling', 'swimming', 'strength', 'street_workout']

/** Toutes les combinaisons non vides de sports : trente-et-une. */
const COMBINAISONS: Sport[][] = []
for (let masque = 1; masque < 1 << SPORTS.length; masque++) {
  COMBINAISONS.push(SPORTS.filter((_, i) => masque & (1 << i)))
}

/** Types de séance qui font vivre chaque sport. */
const TYPES_DU_SPORT: Record<Sport, SessionType[]> = {
  running: ['RUN', 'LONG'],
  cycling: ['BIKE', 'RIDE'],
  swimming: ['SWIM'],
  strength: ['UPPER', 'LOWER'],
  street_workout: ['UPPER', 'LOWER'],
}

/**
 * L'INVARIANT CASSÉ SUR UN COMPTE RÉEL.
 *
 * Un compte déclarant course, vélo et natation recevait trente-deux courses,
 * aucune nage, aucun vélo. Les propriétés ci-dessous sont vérifiées sur les
 * onze objectifs croisés avec les trente-et-une combinaisons de sports, soit
 * trois cent quarante et une semaines : c'est ce balayage, et non un cas
 * corrigé à la main, qui empêche le défaut de revenir.
 */
describe('couverture des disciplines', () => {
  it('ne prescrit jamais une discipline non déclarée', () => {
    for (const goal of OBJECTIFS) {
      for (const sports of COMBINAISONS) {
        for (const doubles of [false, true]) {
          const semaine = Object.values(microcycleEffectif(microcycleDe(goal), sports, doubles))
          for (const t of semaine) {
            expect(
              t === 'REST' || typePraticable(t, sports),
              `${goal} + ${sports.join('+')} : ${t} n'est pas praticable`,
            ).toBe(true)
          }
        }
      }
    }
  })

  it('ne renforce jamais une discipline déjà présente en laissant une autre à zéro', () => {
    /*
     * L'INVARIANT EXACT. Il a fallu deux essais pour le formuler juste, et
     * c'est le balayage qui a corrige la formulation a chaque fois.
     *
     * « Chaque discipline declaree apparait » etait trop fort : la
     * repartition d'une prise de masse n'a ni creneau de nage ni creneau de
     * velo, donc rien n'y est substitue et ces sports ne peuvent pas
     * apparaitre.
     *
     * « Toute discipline candidate a un creneau substitue apparait » l'etait
     * encore : cette meme prise de masse n'a qu'UN creneau aerobie pour deux
     * disciplines declarees — l'une doit perdre, et ce n'est pas un defaut.
     *
     * Ce qui distingue vraiment le defaut d'origine : le remplacant choisi
     * etait une discipline DEJA PRESENTE dans la repartition theorique — la
     * course, trois fois — alors que deux disciplines declarees etaient a
     * zero. Renforcer ce qui abonde en ignorant ce qui manque : voila la
     * faute, et elle se lit sur la semaine finale sans rien rejouer.
     */
    const fautes: string[] = []
    for (const goal of OBJECTIFS) {
      for (const sports of COMBINAISONS) {
        const theorique = microcycleDe(goal)
        const semaine = microcycleEffectif(theorique, sports, false)
        const types = Object.values(semaine)

        const presentAvant = (sport: Sport) =>
          TYPES_DU_SPORT[sport].some((t) => Object.values(theorique).includes(t))
        const presentApres = (sport: Sport) =>
          TYPES_DU_SPORT[sport].some((t) => types.includes(t))

        const oublies = sports.filter((s) => !presentApres(s))
        if (oublies.length === 0) continue

        for (const slot of [0, 1, 2, 3, 4, 5, 6] as const) {
          const voulu = theorique[slot]
          const retenu = semaine[slot]
          if (voulu === retenu || retenu === 'REST') continue

          // Le remplacant appartient-il a une discipline que la repartition
          // theorique servait deja ?
          const renforce = SPORTS.find(
            (s) => TYPES_DU_SPORT[s].includes(retenu) && sports.includes(s) && presentAvant(s),
          )
          if (renforce) {
            fautes.push(
              `${goal} + ${sports.join('+')} : ${voulu}→${retenu} renforce ${renforce} alors que ${oublies.join('/')} reste à zéro`,
            )
          }
        }
      }
    }
    expect(fautes).toEqual([])
  })

  it('ne rend jamais une semaine entièrement au repos', () => {
    for (const goal of OBJECTIFS) {
      for (const sports of COMBINAISONS) {
        const semaine = Object.values(microcycleEffectif(microcycleDe(goal), sports, false))
        expect(
          semaine.some((t) => t !== 'REST'),
          `${goal} + ${sports.join('+')} : semaine vide`,
        ).toBe(true)
      }
    }
  })

  it('reste inchangé quand aucun sport n’est déclaré', () => {
    // Un tableau vide veut dire « on ne sait pas » : on ne substitue rien.
    for (const goal of OBJECTIFS) {
      expect(microcycleEffectif(microcycleDe(goal), [], false)).toEqual(microcycleDe(goal))
    }
  })
})

const etat = (sports: Sport[], type: GoalType | null): AthleteState =>
  ({
    profile: { sports },
    sessions: [],
    weights: [],
    measures: [],
    photos: [],
    wellness: [],
    benchmarks: {},
    records: [],
    goals: type
      ? [{ id: 'g', type, priority: 'principal', status: 'actif', targetDate: null, targetValue: null, targetUnit: null, note: null }]
      : [],
    limitations: [],
  }) as unknown as AthleteState

describe('ce que le programme ne peut pas faire', () => {
  it('signale la force absente sur une perte de poids', () => {
    // Le cas reel : course, velo, natation declares, pas de force.
    const m = manquesDuProgramme(etat(['running', 'cycling', 'swimming'], 'perte_de_poids'))
    expect(m).toHaveLength(1)
    expect(m[0]?.quoi).toBe('de la force')
    expect(m[0]?.consequence).toContain('muscle')
  })

  it('se tait quand la force est déclarée, sous l’une ou l’autre forme', () => {
    for (const sport of ['strength', 'street_workout'] as Sport[]) {
      expect(manquesDuProgramme(etat(['running', sport], 'perte_de_poids'))).toEqual([])
    }
  })

  it('signale la course absente sur un marathon', () => {
    const m = manquesDuProgramme(etat(['swimming', 'strength'], 'marathon'))
    expect(m.map((x) => x.quoi)).toEqual(['la course'])
  })

  it('signale les deux manques d’un HYROX', () => {
    expect(manquesDuProgramme(etat(['swimming'], 'hyrox'))).toHaveLength(2)
  })

  it('ne reproche rien à un objectif sans exigence', () => {
    for (const goal of ['endurance', 'hybride'] as GoalType[]) {
      expect(manquesDuProgramme(etat(['swimming'], goal))).toEqual([])
    }
  })

  it('ne dit rien sans objectif ni sans sport déclaré', () => {
    expect(manquesDuProgramme(etat(['running'], null))).toEqual([])
    expect(manquesDuProgramme(etat([], 'perte_de_poids'))).toEqual([])
  })

  it('ne signale que ce qui est essentiel, pas ce qui est absent de la semaine', () => {
    // La repartition du marathon contient de la natation, mais un marathon ne
    // se perd pas faute de nager.
    expect(manquesDuProgramme(etat(['running', 'strength'], 'marathon'))).toEqual([])
  })
})
