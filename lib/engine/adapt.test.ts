import { describe, expect, it } from 'vitest'
import { adapt, adaptedSets, EASY_FACTOR, HARD_FACTOR } from './adapt'
import { generatePlan } from './program'
import type { Session } from './types'

const MONDAY = '2026-03-16'
const ids = (() => {
  let i = 0
  return () => `s${++i}`
})()

/** Semaine complète générée à partir du lundi, plus la suivante. */
const plan = (): Session[] => generatePlan(MONDAY, 2, 1, { makeId: ids })

const active = (sessions: Session[]) => sessions.filter((x) => x.type !== 'REST')

describe('adapt — séance difficile', () => {
  it('allège les deux séances suivantes de 15 %', () => {
    const sessions = plan()
    const validated = active(sessions)[0]!
    const before = active(sessions).filter((x) => x.date > validated.date)
    const { sessions: next, changed, direction } = adapt(sessions, {
      date: validated.date,
      sessionId: validated.id,
      rpe: 9,
      fatigue: 6,
    })
    expect(direction).toBe('down')
    expect(changed).toHaveLength(2)
    for (const id of changed) {
      const b = before.find((x) => x.id === id)!
      const a = next.find((x) => x.id === id)!
      expect(a.duration).toBe(Math.round(b.duration * HARD_FACTOR))
      expect(a.adapted).toBe('allegee')
      expect(a.goal).toContain('RPE 9')
    }
  })

  it('se déclenche aussi sur une fatigue élevée seule', () => {
    const sessions = plan()
    const validated = active(sessions)[0]!
    const r = adapt(sessions, {
      date: validated.date,
      sessionId: validated.id,
      rpe: 5,
      fatigue: 9,
    })
    expect(r.direction).toBe('down')
    expect(r.changed).toHaveLength(2)
  })

  it('se déclenche sur une douleur même avec un RPE bas', () => {
    const sessions = plan()
    const validated = active(sessions)[0]!
    const r = adapt(sessions, {
      date: validated.date,
      sessionId: validated.id,
      rpe: 3,
      fatigue: 3,
      pain: 'tendon d Achille gauche',
    })
    expect(r.direction).toBe('down')
    expect(r.sessions.find((x) => x.id === r.changed[0])?.goal).toContain('douleur')
  })

  it('ne touche jamais au jour de repos', () => {
    const sessions = plan()
    const validated = active(sessions)[0]!
    const { sessions: next } = adapt(sessions, {
      date: validated.date,
      sessionId: validated.id,
      rpe: 10,
      fatigue: 10,
    })
    expect(next.filter((x) => x.type === 'REST').every((x) => !x.adapted)).toBe(true)
  })
})

describe('adapt — séance facile', () => {
  it('relevé les trois séances suivantes de 5 %', () => {
    const sessions = plan()
    const validated = active(sessions)[0]!
    const r = adapt(sessions, {
      date: validated.date,
      sessionId: validated.id,
      rpe: 3,
      fatigue: 3,
    })
    expect(r.direction).toBe('up')
    expect(r.changed).toHaveLength(3)
    const first = r.sessions.find((x) => x.id === r.changed[0])!
    const before = sessions.find((x) => x.id === r.changed[0])!
    expect(first.duration).toBe(Math.round(before.duration * EASY_FACTOR))
    expect(first.adapted).toBe('légèrement relevée')
  })
})

describe('adapt — zone neutre', () => {
  it('ne change rien entre 5 et 7 de RPE', () => {
    const sessions = plan()
    const validated = active(sessions)[0]!
    const r = adapt(sessions, {
      date: validated.date,
      sessionId: validated.id,
      rpe: 6,
      fatigue: 5,
    })
    expect(r.direction).toBe('none')
    expect(r.changed).toHaveLength(0)
    expect(r.sessions).toBe(sessions)
  })

  it('ne remonte pas le volume sans relevé de fatigue', () => {
    const sessions = plan()
    const validated = active(sessions)[0]!
    const r = adapt(sessions, {
      date: validated.date,
      sessionId: validated.id,
      rpe: 3,
      fatigue: null,
    })
    expect(r.direction).toBe('none')
  })
})

describe('adapt — pas de cumul', () => {
  it('laisse intacte une séance déjà adaptée', () => {
    const sessions = plan()
    const first = active(sessions)[0]!
    const once = adapt(sessions, { date: first.date, sessionId: first.id, rpe: 9, fatigue: 8 })
    const twice = adapt(once.sessions, {
      date: first.date,
      sessionId: first.id,
      rpe: 9,
      fatigue: 8,
    })
    for (const id of once.changed) {
      expect(twice.sessions.find((x) => x.id === id)?.duration).toBe(
        once.sessions.find((x) => x.id === id)?.duration,
      )
    }
    expect(twice.changed).not.toEqual(once.changed)
  })

  it('ne fait rien quand plus aucune séance ne suit', () => {
    const sessions = plan()
    const last = sessions[sessions.length - 1]!
    const r = adapt(sessions, { date: last.date, sessionId: last.id, rpe: 9, fatigue: 9 })
    expect(r.changed).toHaveLength(0)
    expect(r.direction).toBe('down')
  })
})

describe('adaptedSets', () => {
  it('retire des séries sans jamais descendre sous une', () => {
    expect(adaptedSets(4, HARD_FACTOR)).toBe(3)
    expect(adaptedSets(1, HARD_FACTOR)).toBe(1)
    expect(adaptedSets(4, null)).toBe(4)
    expect(adaptedSets(4, 1)).toBe(4)
  })
})
