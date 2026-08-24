import { describe, expect, it } from 'vitest'
import { emptyState, seedState } from '../seed-data'
import {
  nextRung,
  swimBlocker,
  swimTechniqueAdvice,
  weekScore,
  whatMustProgress,
  whatProgresses,
} from './advice'
import { addDays } from './date'
import type { AthleteState, Session } from './types'

const TODAY = '2026-03-16'

const swim = (date: string, minutes: number, distance?: number, continuous?: number): Session => ({
  id: `s-${date}`,
  date,
  type: 'SWIM',
  kind: 'swim',
  status: 'done',
  week: 1,
  title: 'Piscine',
  cues: [],
  duration: minutes,
  intensity: 2,
  exercises: [],
  log: { minutes, distance: distance ?? null, continuous: continuous ?? null },
  rpe: 4,
})

const withSessions = (sessions: Session[]): AthleteState => ({
  ...emptyState(TODAY),
  sessions,
})

describe('nextRung', () => {
  it('donne le palier suivant, jamais celui déjà atteint', () => {
    expect(nextRung(25)).toBe(50)
    expect(nextRung(26)).toBe(50)
    expect(nextRung(100)).toBe(200)
    expect(nextRung(1500)).toBe(1500)
  })
})

describe('swimTechniqueAdvice', () => {
  it('parle technique en dessous de 100 m', () => {
    const advice = swimTechniqueAdvice(25)
    expect(advice).toContain('technique')
    expect(advice).toContain('25 à 50 m')
  })

  it('parle respiration entre 100 et 300 m', () => {
    expect(swimTechniqueAdvice(150)).toContain('respiratoire')
  })

  it('parle allure au-delà de 300 m', () => {
    expect(swimTechniqueAdvice(500)).toContain('allure')
  })

  it('parle endurance pure au-delà de 750 m', () => {
    expect(swimTechniqueAdvice(800)).toContain('endurance pure')
  })
})

describe('swimBlocker', () => {
  it('réclame une première séance quand il n y en a aucune', () => {
    expect(swimBlocker(emptyState(TODAY), TODAY)?.title).toContain('Aucune séance')
  })

  it('identifie la distance non comptée comme blocage numéro un', () => {
    const state = withSessions([swim(addDays(TODAY, -1), 45), swim(addDays(TODAY, -3), 45)])
    const blocker = swimBlocker(state, TODAY)
    expect(blocker?.title).toContain('ne comptes pas ta distance')
    // le chiffre vient des séances, il n'est pas écrit d'avance
    expect(blocker?.text).toContain('90 min')
    expect(blocker?.text).toContain('2 séances')
  })

  it('réclame la distance continue quand seul le total est noté', () => {
    const state = withSessions([swim(addDays(TODAY, -1), 45, 600)])
    expect(swimBlocker(state, TODAY)?.title).toContain('distance continue')
  })

  it('ne bloque plus rien quand tout est mesuré', () => {
    const state = withSessions([swim(addDays(TODAY, -1), 45, 600, 150)])
    expect(swimBlocker(state, TODAY)).toBeNull()
  })
})

describe('whatProgresses', () => {
  it('ne dit rien sans séance sur la semaine', () => {
    expect(whatProgresses(emptyState(TODAY), TODAY)).toBeNull()
  })

  it('salue la régularité quand les jours s enchaînent', () => {
    // l'historique de référence couvre J-5 à J-1 sur trois disciplines
    const insight = whatProgresses(seedState(TODAY), TODAY)
    expect(insight?.title).toContain('régularité')
    expect(insight?.text).toContain('5 jours')
  })
})

describe('whatMustProgress', () => {
  it('chiffre chaque écart sur les données réelles', () => {
    const gaps = whatMustProgress(seedState(TODAY), TODAY, 26)
    const volume = gaps.find((g) => g.title.includes('volume de course'))
    expect(volume?.text).toContain('10.2 km')

    const natation = gaps.find((g) => g.title.includes('natation'))
    expect(natation?.text).toContain('2 séances sans distance notée')

    const reperes = gaps.find((g) => g.title.includes('repères'))
    expect(reperes?.text).toContain('26 %')
  })

  it('ne signale rien sur les repères quand le score est complet', () => {
    const gaps = whatMustProgress(seedState(TODAY), TODAY, 0)
    expect(gaps.some((g) => g.title.includes('repères'))).toBe(false)
  })
})

describe('weekScore', () => {
  it('vaut zéro sans aucune séance', () => {
    expect(weekScore(emptyState(TODAY), TODAY)).toBe(0)
  })

  it('mélange assiduité et volume atteint', () => {
    const score = weekScore(seedState(TODAY), TODAY)
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThanOrEqual(100)
  })
})
