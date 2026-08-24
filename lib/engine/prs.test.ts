import { describe, expect, it } from 'vitest'
import { emptyState, seedState } from '../seed-data'
import { addDays } from './date'
import { badgeState, detectPRs } from './prs'
import type { AthleteState, Session, SessionLog } from './types'

const TODAY = '2026-03-16'

const session = (kind: Session['kind'], type: Session['type']): Session => ({
  id: 'today',
  date: TODAY,
  type,
  kind,
  status: 'planned',
  week: 1,
  title: 'Seance',
  cues: [],
  duration: 45,
  intensity: 3,
  exercises: [],
})

const labels = (s: AthleteState, sess: Session, log: SessionLog) =>
  detectPRs(s, sess, log).map((p) => p.label)

describe('detectPRs — course', () => {
  const s = seedState(TODAY)

  it('détecte la plus longue sortie', () => {
    // record précédent : 5,75 km
    expect(labels(s, session('run', 'RUN'), { km: 7, minutes: 45 })).toContain(
      'Plus longue sortie',
    )
    expect(labels(s, session('run', 'RUN'), { km: 5, minutes: 30 })).not.toContain(
      'Plus longue sortie',
    )
  })

  it('détecte la meilleure allure au-delà de 4 km', () => {
    // record précédent : 5:44/km sur 4,43 km
    const fast = detectPRs(s, session('run', 'RUN'), { km: 5, minutes: 25 })
    expect(fast.find((p) => p.label === 'Meilleure allure sur 4 km+')?.value).toBe('5:00/km')
    expect(labels(s, session('run', 'RUN'), { km: 5, minutes: 35 })).not.toContain(
      'Meilleure allure sur 4 km+',
    )
  })

  it('ignore l allure sous 4 km', () => {
    expect(labels(s, session('run', 'RUN'), { km: 3, minutes: 12 })).not.toContain(
      'Meilleure allure sur 4 km+',
    )
  })

  it('compte la première sortie comme un record', () => {
    expect(labels(emptyState(TODAY), session('run', 'RUN'), { km: 4, minutes: 26 })).toEqual([
      'Plus longue sortie',
      'Meilleure allure sur 4 km+',
    ])
  })
})

describe('detectPRs — natation', () => {
  const s = seedState(TODAY)

  it('détecte un palier de distance continue', () => {
    expect(labels(s, session('swim', 'SWIM'), { continuous: 50, minutes: 45 })).toContain(
      'Distance continue',
    )
    expect(labels(s, session('swim', 'SWIM'), { continuous: 25, minutes: 45 })).not.toContain(
      'Distance continue',
    )
  })

  it('détecte un volume record seulement s il est mesure', () => {
    expect(labels(s, session('swim', 'SWIM'), { distance: 600, minutes: 45 })).toContain(
      'Volume natation',
    )
    expect(labels(s, session('swim', 'SWIM'), { minutes: 45 })).not.toContain('Volume natation')
  })
})

describe('detectPRs — force', () => {
  const s = seedState(TODAY)

  it('enregistré un premier repère testé', () => {
    const prs = detectPRs(s, session('strength', 'UPPER'), {
      tests: [{ key: 'pullups', name: 'tractions', value: 12 }],
    })
    expect(prs[0]?.label).toBe('Record tractions')
    expect(prs[0]?.value).toBe('12')
  })

  it('ne déclenche rien sous le repère connu', () => {
    const prs = detectPRs(s, session('strength', 'LOWER'), {
      tests: [{ key: 'squats', name: 'squats', value: 40 }],
    })
    expect(prs).toHaveLength(0)
  })

  it('compare le volume au même type de séance', () => {
    // 49 répétitions au dernier UPPER enregistré
    expect(labels(s, session('strength', 'UPPER'), { reps: 60 })).toContain('Volume total')
    expect(labels(s, session('strength', 'UPPER'), { reps: 40 })).not.toContain('Volume total')
  })

  it('se compare aux autres séances, jamais à son propre enregistrement', () => {
    // La séance est déjà en base avec un ancien log de 30 km. En la revalidant
    // à 20 km, la comparaison doit se faire sur les autres séances (5,75 km),
    // sinon corriger une saisie erronée ferait disparaître le record.
    const base = seedState(TODAY)
    const current: Session = {
      ...session('run', 'RUN'),
      id: 'dup',
      date: addDays(TODAY, -1),
      status: 'done',
      log: { km: 30, minutes: 200 },
    }
    const s2: AthleteState = { ...base, sessions: [...base.sessions, current] }
    expect(labels(s2, current, { km: 20, minutes: 130 })).toContain('Plus longue sortie')
  })
})

describe('badgeState', () => {
  it('ne valide aucun palier sur un repère non testé', () => {
    const badges = badgeState(seedState(TODAY))
    expect(badges.every((b) => !b.got)).toBe(true)
    expect(badges.filter((b) => b.known)).toHaveLength(0)
  })

  it('valide les paliers atteints une fois le repère mesure', () => {
    const base = seedState(TODAY)
    const s: AthleteState = {
      ...base,
      benchmarks: { ...base.benchmarks, pullups: { value: 12, partial: false, testedAt: TODAY } },
    }
    const badges = badgeState(s)
    expect(badges.find((b) => b.label === '10 tractions strictes')?.got).toBe(true)
    expect(badges.find((b) => b.label === '15 tractions')?.got).toBe(false)
  })
})
