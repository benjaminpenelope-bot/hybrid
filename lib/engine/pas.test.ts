import { describe, expect, it } from 'vitest'
import { bilanDesPas, OBJECTIF_PAS, partDeLObjectif } from './pas'
import type { AthleteState, Wellness } from './types'

const JOUR = '2026-09-04'

const etat = (wellness: Wellness[]): AthleteState =>
  ({
    profile: {},
    sessions: [],
    weights: [],
    measures: [],
    photos: [],
    wellness,
    benchmarks: {},
    records: [],
    goals: [],
    limitations: [],
  }) as unknown as AthleteState

describe('bilan des pas', () => {
  it('rend sept jours, du plus ancien au plus récent', () => {
    const b = bilanDesPas(etat([]), JOUR)
    expect(b.serie).toHaveLength(7)
    expect(b.serie[0]!.date).toBe('2026-08-29')
    expect(b.serie[6]!.date).toBe(JOUR)
  })

  /*
   * Zero voudrait dire « pas un pas », ce qui n'arrive a personne : une
   * journee sans mesure doit rester sans mesure.
   */
  it('laisse un jour non mesuré à null, jamais à zéro', () => {
    const b = bilanDesPas(etat([{ date: JOUR, steps: 8000 }]), JOUR)
    expect(b.serie[0]!.pas).toBeNull()
    expect(b.aujourdhui).toBe(8000)
  })

  it('ne moyenne que les jours mesurés', () => {
    const b = bilanDesPas(
      etat([
        { date: '2026-09-02', steps: 6000 },
        { date: '2026-09-04', steps: 12000 },
      ]),
      JOUR,
    )
    expect(b.mesures).toBe(2)
    expect(b.moyenne).toBe(9000)
  })

  it('ne dit rien quand rien n’est mesuré', () => {
    const b = bilanDesPas(etat([]), JOUR)
    expect(b.moyenne).toBeNull()
    expect(b.aujourdhui).toBeNull()
    expect(b.mesures).toBe(0)
  })

  it('compte les jours où l’objectif est atteint', () => {
    const b = bilanDesPas(
      etat([
        { date: '2026-09-02', steps: OBJECTIF_PAS },
        { date: '2026-09-03', steps: OBJECTIF_PAS - 1 },
        { date: '2026-09-04', steps: 15000 },
      ]),
      JOUR,
    )
    expect(b.atteints).toBe(2)
  })
})

describe('part de l’objectif', () => {
  it('vaut zéro sans mesure', () => {
    expect(partDeLObjectif(null)).toBe(0)
  })

  it('ne dépasse jamais un', () => {
    expect(partDeLObjectif(30000)).toBe(1)
  })

  it('suit la proportion entre les deux', () => {
    expect(partDeLObjectif(5000)).toBe(0.5)
  })
})
