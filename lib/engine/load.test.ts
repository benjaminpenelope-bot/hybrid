import { describe, expect, it } from 'vitest'
import { emptyState, seedState } from '../seed-data'
import { addDays } from './date'
import { acuteChronic, consecutiveDays, loadSeries, sessionLoad } from './load'
import type { AthleteState, Session } from './types'

const TODAY = '2026-03-16'

function withSessions(base: AthleteState, sessions: Session[]): AthleteState {
  return { ...base, sessions }
}

function runOn(date: string, minutes: number, rpe: number | null, rpeEst?: number): Session {
  return {
    id: `r-${date}`,
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
    log: { km: 8, minutes },
    rpe,
    rpeEst: rpeEst ?? null,
  }
}

describe('sessionLoad', () => {
  it('multiplie la durée par le RPE', () => {
    expect(sessionLoad(45, 7)).toBe(315)
  })
})

describe('loadSeries', () => {
  it('rend un point par jour, aujourd hui inclus', () => {
    const s = seedState(TODAY)
    const séries = loadSeries(s, 7, TODAY)
    expect(séries).toHaveLength(7)
    expect(séries[6]?.date).toBe(TODAY)
    expect(séries[0]?.date).toBe(addDays(TODAY, -6))
  })

  it('utilise le RPE estimé et marque le point comme estimé', () => {
    const s = seedState(TODAY)
    const séries = loadSeries(s, 7, TODAY)
    const run = séries.find((x) => x.date === addDays(TODAY, -4))
    // 25,4 min x RPE estimé 6
    expect(run?.load).toBe(152)
    expect(run?.est).toBe(true)
  })

  it('ne marque pas comme estimé un jour dont le RPE est saisi', () => {
    const s = withSessions(emptyState(TODAY), [runOn(addDays(TODAY, -1), 40, 7)])
    const point = loadSeries(s, 7, TODAY).find((x) => x.date === addDays(TODAY, -1))
    expect(point?.load).toBe(280)
    expect(point?.est).toBe(false)
  })

  it('ignore les séances prévues et sautées', () => {
    const planned: Session = { ...runOn(TODAY, 60, 8), status: 'planned' }
    const skipped: Session = { ...runOn(addDays(TODAY, -1), 60, 8), status: 'skipped' }
    const s = withSessions(emptyState(TODAY), [planned, skipped])
    expect(loadSeries(s, 7, TODAY).every((x) => x.load === 0)).toBe(true)
  })
})

describe('acuteChronic', () => {
  it('ne produit pas de faux rouge sur une première semaine de données', () => {
    const s = seedState(TODAY)
    const { acwr, span, reliable } = acuteChronic(s, TODAY)
    // 5 jours d historique : la charge chronique est ramenée à 7 jours,
    // le ratio vaut donc exactement 1.
    expect(span).toBe(7)
    expect(acwr).toBeCloseTo(1, 5)
    expect(reliable).toBe(false)
  })

  it('rend un ratio de 1 sur une seule séance', () => {
    const s = withSessions(emptyState(TODAY), [runOn(addDays(TODAY, -1), 45, 6)])
    expect(acuteChronic(s, TODAY).acwr).toBeCloseTo(1, 5)
  })

  it('rend un ratio de 1 sans aucun historique', () => {
    const { acwr, l7, l28, reliable } = acuteChronic(emptyState(TODAY), TODAY)
    expect(acwr).toBe(1)
    expect(l7).toBe(0)
    expect(l28).toBe(0)
    expect(reliable).toBe(false)
  })

  it('détecte une hausse brutale sur un historique suffisant', () => {
    const sessions: Session[] = []
    // 3 semaines à charge faible
    for (let i = 28; i > 7; i--) sessions.push(runOn(addDays(TODAY, -i), 30, 4))
    // dernière semaine à charge triple
    for (let i = 7; i >= 1; i--) sessions.push(runOn(addDays(TODAY, -i), 90, 8))
    const s = withSessions(emptyState(TODAY), sessions)
    const { acwr, reliable, span } = acuteChronic(s, TODAY)
    expect(span).toBe(28)
    expect(reliable).toBe(true)
    expect(acwr).toBeGreaterThan(1.5)
  })
})

describe('consecutiveDays', () => {
  it('compte les jours enchaînés avant aujourd hui', () => {
    // l historique de référence couvre J-5 à J-1 sans interruption
    expect(consecutiveDays(seedState(TODAY), TODAY)).toBe(5)
  })

  it('s arrête au premier jour sans séance', () => {
    const s = withSessions(emptyState(TODAY), [
      runOn(addDays(TODAY, -1), 40, 6),
      runOn(addDays(TODAY, -3), 40, 6),
    ])
    expect(consecutiveDays(s, TODAY)).toBe(1)
  })

  it('rend 0 sans historique', () => {
    expect(consecutiveDays(emptyState(TODAY), TODAY)).toBe(0)
  })
})
