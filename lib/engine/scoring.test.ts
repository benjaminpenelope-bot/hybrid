import { describe, expect, it } from 'vitest'
import { emptyState, seedState } from '../seed-data'
import { addDays } from './date'
import { computeScores, levelOf, marathonReadiness, SUB_WEIGHTS } from './scoring'
import { UNTESTED } from './state'
import type { AthleteState, Session } from './types'

const TODAY = '2026-03-16'

const part = (s: AthleteState, key: 'force' | 'street' | 'running' | 'physique', k: string) =>
  computeScores(s, TODAY).subs[key].parts.find((p) => p.k === k)

describe('ponderation', () => {
  it('somme les poids des sous-scores à 100', () => {
    expect(Object.values(SUB_WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100)
  })
})

describe('computeScores — historique vide', () => {
  const s = emptyState(TODAY)

  it('ne plante pas et rend un score borné', () => {
    const r = computeScores(s, TODAY)
    expect(r.global).toBeGreaterThanOrEqual(0)
    expect(r.global).toBeLessThanOrEqual(100)
  })

  it('exclut la force du calcul faute de repère testé', () => {
    expect(computeScores(s, TODAY).subs.force.score).toBeNull()
    expect(computeScores(s, TODAY).subs.force.coverage).toBe(0)
  })

  it('annonce une couverture très faible', () => {
    const r = computeScores(s, TODAY)
    expect(r.missing).toBeGreaterThan(50)
    expect(r.coverage).toBeLessThan(0.5)
  })
})

describe('computeScores — historique réel de référence', () => {
  const s = seedState(TODAY)
  const r = computeScores(s, TODAY)

  it('calcule le running sur les deux sorties enregistrées', () => {
    // 4,43 + 5,75 = 10,18 km sur 7 jours, plus longue sortie 5,75 km,
    // meilleure allure 5:44/km
    expect(r.subs.running.coverage).toBe(1)
    expect(r.subs.running.score).toBe(30)
    expect(part(s, 'running', 'Volume hebdo')?.detail).toBe('10.2 km / 55 km')
  })

  it('note la natation sur la distance continue réellement mesurée', () => {
    // 25 m continus = plancher de l échelle, deux séances sur 14 jours
    expect(r.subs.natation.score).toBe(10)
  })

  it('n inventé aucun repère de force non testé', () => {
    expect(part(s, 'force', 'Tractions max')?.v).toBeNull()
    expect(part(s, 'force', 'Tractions max')?.detail).toBe(UNTESTED)
    expect(part(s, 'street', 'Muscle-up')?.v).toBeNull()
    // seul le squat est renseigne, et il est marque comme partiel
    expect(part(s, 'force', 'Squats max')?.detail).toBe('50+ / 80')
    expect(r.subs.force.coverage).toBeCloseTo(0.25, 5)
  })

  it('marque le score comme partiel', () => {
    expect(r.missing).toBeGreaterThan(0)
    expect(r.missing).toBeLessThan(100)
  })

  it('ne compte pas une pesée unique comme une vitesse de prise', () => {
    expect(part(s, 'physique', 'Vitesse de prise')?.v).toBeNull()
  })
})

describe('computeScores — repères testés', () => {
  it('fait monter la force et la couverture', () => {
    const base = seedState(TODAY)
    const tested: AthleteState = {
      ...base,
      benchmarks: {
        ...base.benchmarks,
        pullups: { value: 12, partial: false, testedAt: TODAY },
        dips: { value: 20, partial: false, testedAt: TODAY },
        muscleups: { value: 2, partial: false, testedAt: TODAY },
        legraises: { value: 8, partial: false, testedAt: TODAY },
      },
    }
    const before = computeScores(base, TODAY)
    const after = computeScores(tested, TODAY)
    expect(after.subs.force.score).not.toBeNull()
    expect(after.subs.force.coverage).toBe(1)
    expect(after.missing).toBeLessThan(before.missing)
  })
})

describe('marathonReadiness', () => {
  it('rend 0 sans aucune course enregistrée', () => {
    const m = marathonReadiness(emptyState(TODAY), TODAY)
    expect(m.pct).toBe(0)
    expect(m.bestPace).toBeNull()
  })

  it('progresse avec le volume et la sortie longue', () => {
    const base = seedState(TODAY)
    const long: Session = {
      id: 'long',
      date: addDays(TODAY, -1),
      type: 'LONG',
      kind: 'run',
      status: 'done',
      week: 1,
      title: 'Sortie longue',
      cues: [],
      duration: 150,
      intensity: 3,
      exercises: [],
      log: { km: 22, minutes: 150 },
      rpe: 6,
    }
    const after = marathonReadiness({ ...base, sessions: [...base.sessions, long] }, TODAY)
    const before = marathonReadiness(base, TODAY)
    expect(after.longest).toBe(22)
    expect(after.pct).toBeGreaterThan(before.pct)
  })
})

describe('levelOf', () => {
  it('associe un palier à chaque score', () => {
    expect(levelOf(0).n).toBe(1)
    expect(levelOf(29).n).toBe(1)
    expect(levelOf(30).n).toBe(2)
    expect(levelOf(50).n).toBe(3)
    expect(levelOf(70).n).toBe(4)
    expect(levelOf(100).n).toBe(5)
  })
})
