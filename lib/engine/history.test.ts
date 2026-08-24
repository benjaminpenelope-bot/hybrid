import { describe, expect, it } from 'vitest'
import { emptyState, seedState } from '../seed-data'
import { addDays, mondayOf } from './date'
import { disciplineSplit, weeklySeries } from './history'
import type { AthleteState, Session } from './types'

/** Un lundi, pour que les bornes de semaine soient lisibles dans les attentes. */
const TODAY = '2026-03-16'

function withSessions(base: AthleteState, sessions: Session[]): AthleteState {
  return { ...base, sessions }
}

function session(date: string, over: Partial<Session>): Session {
  return {
    id: `s-${date}-${over.type ?? 'RUN'}`,
    date,
    type: 'RUN',
    kind: 'run',
    status: 'done',
    week: 1,
    title: 'Footing',
    cues: [],
    duration: 40,
    intensity: 2,
    exercises: [],
    log: null,
    rpe: 6,
    rpeEst: null,
    ...over,
  }
}

describe('weeklySeries', () => {
  it("ne remonte pas avant la première séance connue", () => {
    // Tracer des zéros avant l'arrivée de l'athlète ferait passer une absence
    // d'observation pour des semaines sans entraînement.
    const s = withSessions(emptyState(TODAY), [session(addDays(TODAY, -3), { log: { km: 8, minutes: 40 } })])
    const points = weeklySeries(s, TODAY, 12)
    // La séance tombe dans la semaine précédente : deux semaines observées, pas douze.
    expect(points).toHaveLength(2)
    expect(points[0]?.week).toBe(mondayOf(addDays(TODAY, -3)))
  })

  it('regroupe les distances par semaine calendaire', () => {
    const s = withSessions(emptyState(TODAY), [
      session(addDays(TODAY, -8), { log: { km: 5, minutes: 30 } }),
      session(addDays(TODAY, -1), { id: 'a', log: { km: 6, minutes: 35 } }),
      session(TODAY, { id: 'b', log: { km: 4, minutes: 22 } }),
    ])
    const points = weeklySeries(s, TODAY, 12)
    // J-8 et J-1 tombent chacun un dimanche, donc dans deux semaines différentes.
    expect(points).toHaveLength(3)
    expect(points[0]?.km).toBe(5)
    expect(points[1]?.km).toBe(6)
    expect(points[2]?.km).toBe(4)
  })

  it('compte une semaine vécue sans séance comme un vrai zéro', () => {
    const s = withSessions(emptyState(TODAY), [
      session(addDays(TODAY, -14), { log: { km: 10, minutes: 55 } }),
      session(TODAY, { id: 'b', log: { km: 4, minutes: 22 } }),
    ])
    const points = weeklySeries(s, TODAY, 12)
    expect(points).toHaveLength(3)
    expect(points[1]?.km).toBe(0)
    expect(points[1]?.done).toBe(0)
  })

  it('ne compte dans le volume que les séances validées', () => {
    const s = withSessions(emptyState(TODAY), [
      session(TODAY, { status: 'planned', log: { km: 12, minutes: 60 } }),
    ])
    const points = weeklySeries(s, TODAY, 12)
    expect(points[0]?.km).toBe(0)
    expect(points[0]?.planned).toBe(1)
    expect(points[0]?.done).toBe(0)
  })

  it('exclut le repos des séances prévues', () => {
    const s = withSessions(emptyState(TODAY), [
      session(TODAY, { type: 'REST', kind: 'rest', status: 'planned' }),
    ])
    expect(weeklySeries(s, TODAY, 12)[0]?.planned).toBe(0)
  })

  it('reste borné au nombre de semaines demandé', () => {
    expect(weeklySeries(seedState(TODAY), TODAY, 4).length).toBeLessThanOrEqual(4)
  })
})

describe('disciplineSplit', () => {
  it('additionne les minutes réellement enregistrées par discipline', () => {
    const s = withSessions(emptyState(TODAY), [
      session(addDays(TODAY, -2), { log: { km: 8, minutes: 42 } }),
      session(addDays(TODAY, -4), {
        id: 'n',
        type: 'SWIM',
        kind: 'swim',
        log: { minutes: 35, distance: 800 },
      }),
    ])
    const parts = disciplineSplit(s, TODAY, 28)
    expect(parts.find((p) => p.kind === 'run')?.minutes).toBe(42)
    expect(parts.find((p) => p.kind === 'swim')?.minutes).toBe(35)
    expect(parts.find((p) => p.kind === 'strength')?.minutes).toBe(0)
  })

  it('ignore ce qui est hors de la fenêtre', () => {
    const s = withSessions(emptyState(TODAY), [
      session(addDays(TODAY, -40), { log: { km: 8, minutes: 42 } }),
    ])
    expect(disciplineSplit(s, TODAY, 28).every((p) => p.minutes === 0)).toBe(true)
  })

  it('ne compte pas une séance seulement prévue', () => {
    const s = withSessions(emptyState(TODAY), [
      session(addDays(TODAY, -1), { status: 'planned', duration: 50 }),
    ])
    expect(disciplineSplit(s, TODAY, 28).every((p) => p.minutes === 0)).toBe(true)
  })
})
