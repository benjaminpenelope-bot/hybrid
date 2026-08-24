import { describe, expect, it } from 'vitest'
import { emptyState, seedState } from '../seed-data'
import { addDays } from './date'
import { computeRecovery, NEUTRAL_RECOVERY, ZONES, zoneOf } from './recovery'
import { computeScores } from './scoring'
import type { AthleteState, Session } from './types'

const TODAY = '2026-03-16'

function hardRun(date: string): Session {
  return {
    id: `h-${date}`,
    date,
    type: 'RUN',
    kind: 'run',
    status: 'done',
    week: 1,
    title: 'Footing',
    cues: [],
    duration: 90,
    intensity: 4,
    exercises: [],
    log: { km: 15, minutes: 90 },
    rpe: 9,
  }
}

describe('zoneOf', () => {
  it('decoupe en trois zones', () => {
    expect(zoneOf(85)).toBe('GREEN')
    expect(zoneOf(70)).toBe('GREEN')
    expect(zoneOf(69)).toBe('YELLOW')
    expect(zoneOf(45)).toBe('YELLOW')
    expect(zoneOf(44)).toBe('RED')
  })
})

describe('computeRecovery — sans donnée', () => {
  it('rend un score neutre et une couverture nulle', () => {
    const r = computeRecovery(emptyState(TODAY), TODAY)
    expect(r.score).toBe(NEUTRAL_RECOVERY)
    expect(r.coverage).toBe(0)
    expect(r.parts.every((p) => p.v === null)).toBe(true)
  })
})

describe('computeRecovery — historique de référence sans relevé', () => {
  const r = computeRecovery(seedState(TODAY), TODAY)

  it('calcule sur la charge seule et le signale', () => {
    expect(r.coverage).toBeCloseTo(0.4, 5)
    expect(r.parts.find((p) => p.k === 'Sommeil')?.v).toBeNull()
    expect(r.parts.find((p) => p.k === 'Fatigue ressentie')?.v).toBeNull()
  })

  it('penalise cinq jours sans coupure', () => {
    expect(r.streak).toBe(5)
    expect(r.parts.find((p) => p.k === 'Jours consécutifs')?.v).toBe(50)
    expect(r.score).toBe(75)
    expect(r.zone).toBe('GREEN')
  })
})

describe('computeRecovery — avec relevé quotidien', () => {
  it('monte avec un bon sommeil et une fatigue basse', () => {
    const base = seedState(TODAY)
    const s: AthleteState = {
      ...base,
      wellness: [{ date: TODAY, sleep: 8, fatigue: 2, motivation: 8, soreness: '' }],
    }
    const r = computeRecovery(s, TODAY)
    expect(r.coverage).toBe(1)
    expect(r.score).toBe(82)
    expect(r.zone).toBe('GREEN')
  })

  it('bascule en rouge sur une fatigue élevée et une charge en pic', () => {
    const base = emptyState(TODAY)
    const sessions: Session[] = []
    for (let i = 28; i > 7; i--)
      sessions.push({ ...hardRun(addDays(TODAY, -i)), duration: 20, log: { km: 3, minutes: 20 }, rpe: 3 })
    for (let i = 7; i >= 1; i--) sessions.push(hardRun(addDays(TODAY, -i)))
    const s: AthleteState = {
      ...base,
      sessions,
      wellness: [{ date: TODAY, sleep: 5, fatigue: 9, motivation: 3, soreness: 'mollets' }],
    }
    const r = computeRecovery(s, TODAY)
    expect(r.acwr).toBeGreaterThan(1.5)
    expect(r.zone).toBe('RED')
    expect(r.soreness).toBe('mollets')
  })

  it('prend le relevé le plus récent, pas le dernier inséré', () => {
    const base = seedState(TODAY)
    const s: AthleteState = {
      ...base,
      wellness: [
        { date: TODAY, sleep: 8, fatigue: 2 },
        { date: addDays(TODAY, -3), sleep: 4, fatigue: 9 },
      ],
    }
    expect(computeRecovery(s, TODAY).parts.find((p) => p.k === 'Sommeil')?.detail).toBe('8 h')
  })

  it('ignore un relevé posterieur à la date évaluée', () => {
    const base = seedState(TODAY)
    const s: AthleteState = {
      ...base,
      wellness: [{ date: addDays(TODAY, 1), sleep: 9, fatigue: 1 }],
    }
    expect(computeRecovery(s, TODAY).parts.find((p) => p.k === 'Sommeil')?.v).toBeNull()
  })
})

describe('computeRecovery — zone honnête', () => {
  it('ne conseille rien quand rien n est mesuré', () => {
    const r = computeRecovery(emptyState(TODAY), TODAY)
    expect(r.measured).toBe(false)
    expect(r.zone).toBe('UNKNOWN')
    // le 65 affiché est un remplissage, pas un diagnostic
    expect(ZONES[r.zone].label).toBe('Non mesurée')
    expect(ZONES[r.zone].advice).not.toContain('intensité')
  })

  it('sort du score global tant qu elle n est pas mesurée', () => {
    const scores = computeScores(emptyState(TODAY), TODAY)
    expect(scores.subs.recuperation.score).toBeNull()
  })

  it('rend une vraie zone dès qu une composante est mesurée', () => {
    const r = computeRecovery(seedState(TODAY), TODAY)
    expect(r.measured).toBe(true)
    expect(r.zone).toBe('GREEN')
  })
})
