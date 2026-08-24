import { describe, expect, it } from 'vitest'
import { emptyState, seedState } from '../seed-data'
import { addDays } from './date'
import { runStats, streetStats, swimStats, timeLabel } from './perf'
import { computeGoals } from './goals'
import { buildReview } from './review'
import type { AthleteState, Session } from './types'

const TODAY = '2026-03-16'

const run = (date: string, km: number, minutes: number, hr?: number): Session => ({
  id: `r-${date}-${km}`,
  date,
  type: 'RUN',
  kind: 'run',
  status: 'done',
  week: 1,
  title: 'Footing',
  cues: [],
  duration: minutes,
  intensity: 2,
  exercises: [],
  log: { km, minutes, hr: hr ?? null },
  rpe: 5,
})

const withSessions = (sessions: Session[]): AthleteState => ({
  ...emptyState(TODAY),
  sessions,
})

describe('runStats', () => {
  it('ne rend aucun chiffre sans sortie enregistrée', () => {
    const s = runStats(emptyState(TODAY), TODAY)
    expect(s.longest).toBeNull()
    expect(s.bestPace).toBeNull()
    expect(s.best5k).toBeNull()
    expect(s.avgHr).toBeNull()
    expect(s.km7).toBe(0)
  })

  it('ne calcule un temps sur 5 km que sur une sortie qui les atteint', () => {
    // 4 km ne permettent pas de conclure sur 5 km
    expect(runStats(withSessions([run(TODAY, 4, 24)]), TODAY).best5k).toBeNull()
    // 6 km à 6:00/km donnent 30 min sur 5 km
    expect(runStats(withSessions([run(TODAY, 6, 36)]), TODAY).best5k).toBe(30)
  })

  it('sépare les volumes 7 et 30 jours', () => {
    const s = runStats(
      withSessions([run(addDays(TODAY, -3), 10, 60), run(addDays(TODAY, -20), 8, 48)]),
      TODAY,
    )
    expect(s.km7).toBe(10)
    expect(s.km30).toBe(18)
  })

  it('moyenne la FC sur les seules sorties où elle a été mesurée', () => {
    const s = runStats(
      withSessions([run(TODAY, 5, 30, 150), run(addDays(TODAY, -1), 5, 30)]),
      TODAY,
    )
    expect(s.avgHr).toBe(150)
  })
})

describe('swimStats', () => {
  it('reprend la distance des séances enregistrées', () => {
    // l'historique de référence contient deux séances à 25 m continus
    expect(swimStats(seedState(TODAY), TODAY).continuous).toBe(25)
  })

  it('retient la distance déclarée tant qu aucune séance ne la dépasse', () => {
    const base = seedState(TODAY)
    const declared: AthleteState = {
      ...base,
      benchmarks: { swim_continuous: { value: 200, partial: true, testedAt: TODAY } },
    }
    // 200 m déclarés contre 25 m nagés : c'est le déclaré qui compte
    expect(swimStats(declared, TODAY).continuous).toBe(200)
  })

  it('rend null quand rien n a jamais été nagé ni déclaré', () => {
    expect(swimStats(emptyState(TODAY), TODAY).continuous).toBeNull()
  })

  it('place le palier atteint sur l échelle', () => {
    const base = seedState(TODAY)
    const s = swimStats(
      {
        ...base,
        benchmarks: { swim_continuous: { value: 100, partial: true, testedAt: TODAY } },
      },
      TODAY,
    )
    expect(s.continuous).toBe(100)
    expect(s.ladder.find((r) => r.current)?.distance).toBe(100)
    expect(s.ladder.find((r) => r.distance === 150)?.reached).toBe(false)
  })

  it('ne calcule une allure que si distance et durée sont mesurées', () => {
    expect(swimStats(emptyState(TODAY), TODAY).pacePer100).toBeNull()
  })
})

describe('streetStats', () => {
  it('marque les repères non testés et les planchers', () => {
    const s = streetStats(seedState(TODAY), TODAY)
    expect(s.cards.find((c) => c.key === 'pullups')?.value).toBeNull()
    // le squat du seed est un « au moins 50 »
    const squats = s.cards.find((c) => c.key === 'squats')
    expect(squats?.value).toBe(50)
    expect(squats?.partial).toBe(true)
  })

  it('compte le volume à la barre sur 14 jours', () => {
    // l'historique de référence contient une séance UPPER à 49 répétitions
    expect(streetStats(seedState(TODAY), TODAY).barVolume14d).toBe(49)
  })
})

describe('computeGoals', () => {
  it('laisse la progression à null quand la donnée manque', () => {
    const goals = computeGoals(emptyState(TODAY), TODAY)
    const marathon = goals.find((g) => g.label === 'Marathon sous 4 h')
    expect(marathon?.progress).toBeNull()
    expect(marathon?.current).toContain('aucune sortie')
  })

  it('calcule la progression sur les données réelles', () => {
    const state = withSessions([run(addDays(TODAY, -2), 21.1, 130)])
    const goals = computeGoals(state, TODAY)
    expect(goals.find((g) => g.label === 'Marathon sous 4 h')?.progress).toBe(50)
  })

  it('couvre les quatre horizons', () => {
    const horizons = new Set(computeGoals(seedState(TODAY), TODAY).map((g) => g.horizon))
    expect(horizons.size).toBe(4)
  })
})

describe('buildReview', () => {
  it('ne compare rien quand la période précédente est vide', () => {
    const review = buildReview(withSessions([run(addDays(TODAY, -2), 10, 60)]), TODAY, 7)
    expect(review.done).toBe(1)
    expect(review.metrics.find((m) => m.label === 'Course')?.delta).toBeNull()
  })

  it('compare la période à la précédente', () => {
    const state = withSessions([
      run(addDays(TODAY, -10), 10, 60),
      run(addDays(TODAY, -2), 12, 72),
    ])
    const review = buildReview(state, TODAY, 7)
    expect(review.metrics.find((m) => m.label === 'Course')?.delta).toBe(20)
    expect(review.progressing).toContain('Course')
  })

  it('signale ce qui recule', () => {
    const state = withSessions([
      run(addDays(TODAY, -10), 20, 120),
      run(addDays(TODAY, -2), 10, 60),
    ])
    expect(buildReview(state, TODAY, 7).lagging).toContain('Course')
  })
})

describe('timeLabel', () => {
  it('formate les durées sans inventer de valeur', () => {
    expect(timeLabel(null)).toBe('à mesurer')
    expect(timeLabel(30)).toBe('30:00')
    expect(timeLabel(65.5)).toBe('1:05:30')
  })
})
