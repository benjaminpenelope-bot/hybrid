import { describe, expect, it } from 'vitest'
import { seedState } from '../seed-data'
import { addDays } from './date'
import { previousOfType, summarize } from './summary'
import type { AthleteState, Session } from './types'

const TODAY = '2026-03-16'

const run = (id: string, date: string, km: number, minutes: number, hr?: number): Session => ({
  id,
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
  ...seedState(TODAY),
  sessions,
})

describe('previousOfType', () => {
  it('prend la séance la plus récente du même type', () => {
    const a = run('a', addDays(TODAY, -10), 5, 30)
    const b = run('b', addDays(TODAY, -3), 6, 36)
    const now = run('now', TODAY, 8, 48)
    expect(previousOfType(withSessions([a, b, now]), now)?.id).toBe('b')
  })

  it('ignore la séance en cours et les autres disciplines', () => {
    const now = run('now', TODAY, 8, 48)
    const swim: Session = { ...run('s', addDays(TODAY, -1), 0, 45), type: 'SWIM', kind: 'swim' }
    expect(previousOfType(withSessions([swim, now]), now)).toBeNull()
  })

  it('rend null quand c est la première du genre', () => {
    const now = run('now', TODAY, 8, 48)
    expect(previousOfType(withSessions([now]), now)).toBeNull()
  })
})

describe('summarize — course', () => {
  it('compare distance et allure à la séance précédente', () => {
    const before = run('a', addDays(TODAY, -7), 5, 35) // 7:00/km
    const now = run('now', TODAY, 6, 36) // 6:00/km
    const s = summarize(withSessions([before, now]), now)

    const distance = s.metrics.find((m) => m.label === 'Distance')
    expect(distance?.value).toBe('6.00 km')
    expect(distance?.delta).toBe(20)

    // l'allure descend de 7:00 à 6:00 : c'est un progrès, donc un delta positif
    const allure = s.metrics.find((m) => m.label === 'Allure')
    expect(allure?.value).toBe('6:00/km')
    expect(allure?.delta).toBeGreaterThan(0)
  })

  it('ne compare rien sans séance précédente', () => {
    const now = run('now', TODAY, 6, 36)
    const s = summarize(withSessions([now]), now)
    expect(s.previousDate).toBeNull()
    expect(s.metrics.every((m) => m.delta === null)).toBe(true)
  })

  it('n affiche la FC que si elle a été mesurée', () => {
    const now = run('now', TODAY, 6, 36)
    expect(summarize(withSessions([now]), now).metrics.some((m) => m.label === 'FC moyenne')).toBe(
      false,
    )
    const withHr = run('now', TODAY, 6, 36, 150)
    expect(
      summarize(withSessions([withHr]), withHr).metrics.some((m) => m.label === 'FC moyenne'),
    ).toBe(true)
  })
})

describe('summarize — natation', () => {
  it('met en avant la distance continue', () => {
    const swim = (id: string, date: string, continuous: number): Session => ({
      ...run(id, date, 0, 45),
      type: 'SWIM',
      kind: 'swim',
      log: { minutes: 45, continuous },
    })
    const before = swim('a', addDays(TODAY, -7), 25)
    const now = swim('now', TODAY, 50)
    const s = summarize(withSessions([before, now]), now)
    const metric = s.metrics.find((m) => m.label === 'Distance continue')
    expect(metric?.value).toBe('50 m')
    expect(metric?.delta).toBe(100)
    expect(s.volumeLabel).toBe('50 m sans pause')
  })
})

describe('summarize — force', () => {
  it('compare le volume de répétitions', () => {
    const strength = (id: string, date: string, reps: number): Session => ({
      ...run(id, date, 0, 50),
      type: 'UPPER',
      kind: 'strength',
      log: { minutes: 50, reps, sets: 12 },
    })
    const before = strength('a', addDays(TODAY, -7), 40)
    const now = strength('now', TODAY, 50)
    const s = summarize(withSessions([before, now]), now)
    expect(s.metrics.find((m) => m.label === 'Répétitions')?.delta).toBe(25)
    expect(s.volumeLabel).toBe('50 répétitions sur 12 séries')
  })
})
