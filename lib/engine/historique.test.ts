import { describe, expect, it } from 'vitest'
import { courbeDesScores, historiqueDesBilans, semainesCloses } from './historique'
import type { AthleteState, ISODate, Session } from './types'

/** Dimanche 6 septembre 2026. La semaine en cours va du lundi 31 août. */
const JOUR: ISODate = '2026-09-06'

function sortie(date: ISODate, km: number, status: Session['status'] = 'done'): Session {
  return {
    id: `${date}-${km}`,
    date,
    type: 'RUN',
    kind: 'run',
    status,
    week: 1,
    title: 'Course',
    cues: [],
    duration: 40,
    intensity: 2,
    exercises: [],
    log: { km, minutes: 40 },
  } as Session
}

function etat(sessions: Session[]): AthleteState {
  return {
    profile: { baseWeeklyKm: 20 } as AthleteState['profile'],
    sessions,
    weights: [],
    measures: [],
    photos: [],
    wellness: [],
    benchmarks: {} as AthleteState['benchmarks'],
    records: [],
    goals: [],
    limitations: [],
  }
}

describe('semaines closes', () => {
  it('exclut la semaine en cours', () => {
    const s = semainesCloses(JOUR, 2)
    // Le lundi courant est le 31 août : la première semaine close est celle
    // du 24, la seconde celle du 17.
    expect(s.map((x) => x.semaine)).toEqual(['2026-08-24', '2026-08-17'])
  })

  it('couvre bien lundi à dimanche', () => {
    const [premiere] = semainesCloses(JOUR, 1)
    expect(premiere).toEqual({ semaine: '2026-08-24', du: '2026-08-24', au: '2026-08-30' })
  })

  it('reste juste un lundi, où la semaine close est celle qui vient de finir', () => {
    // Lundi 7 septembre : la semaine du 31 août est terminée depuis la veille.
    const [premiere] = semainesCloses('2026-09-07', 1)
    expect(premiere?.semaine).toBe('2026-08-31')
  })
})

describe('historique des bilans', () => {
  it('ne rend rien tant qu’aucune séance n’est faite', () => {
    expect(historiqueDesBilans(etat([sortie('2026-08-25', 8, 'planned')]), JOUR)).toEqual([])
  })

  it('s’arrête à la première séance enregistrée', () => {
    // Une seule séance, dans la semaine du 24 août : les semaines d'avant
    // n'existent pas pour cet athlète.
    const h = historiqueDesBilans(etat([sortie('2026-08-25', 8)]), JOUR, 12)
    expect(h).toHaveLength(1)
    expect(h[0]?.semaine).toBe('2026-08-24')
  })

  it('compte les kilomètres dans la bonne semaine', () => {
    const h = historiqueDesBilans(
      etat([sortie('2026-08-19', 10), sortie('2026-08-25', 6)]),
      JOUR,
      12,
    )
    // Du plus récent au plus ancien : 24 août puis 17 août.
    expect(h.map((b) => b.semaine)).toEqual(['2026-08-24', '2026-08-17'])
    expect(h[0]?.review.metrics.find((m) => m.label === 'Course')?.value).toBe('6.0 km')
    expect(h[1]?.review.metrics.find((m) => m.label === 'Course')?.value).toBe('10.0 km')
  })

  it('compare chaque semaine à celle qui la précède, pas à aujourd’hui', () => {
    const h = historiqueDesBilans(
      etat([sortie('2026-08-19', 10), sortie('2026-08-25', 20)]),
      JOUR,
      12,
    )
    // 20 km après 10 km : +100 %, calculé au 30 août et non au 6 septembre.
    expect(h[0]?.review.metrics.find((m) => m.label === 'Course')?.delta).toBe(100)
  })

  it('borne la profondeur demandée', () => {
    const sessions = Array.from({ length: 20 }, (_, i) => sortie(`2026-0${i < 9 ? '5' : '6'}-0${(i % 9) + 1}`, 5))
    expect(historiqueDesBilans(etat(sessions), JOUR, 4).length).toBeLessThanOrEqual(4)
  })
})

describe('courbe des scores', () => {
  it('se lit du plus ancien au plus récent', () => {
    const h = historiqueDesBilans(
      etat([sortie('2026-08-19', 10), sortie('2026-08-25', 6)]),
      JOUR,
      12,
    )
    expect(courbeDesScores(h).map((p) => p.date)).toEqual(['2026-08-17', '2026-08-24'])
  })
})
