import { describe, expect, it } from 'vitest'
import { calendrierIcs } from './ics'
import type { AthleteState, ISODate, Session } from '@/lib/engine/types'

const JOUR: ISODate = '2026-09-06'

function seance(over: Partial<Session> = {}): Session {
  return {
    id: 'abc',
    date: '2026-09-07',
    type: 'RUN',
    kind: 'run',
    status: 'planned',
    week: 3,
    title: 'Footing 8 km',
    cues: [],
    duration: 40,
    intensity: 2,
    exercises: [],
    ...over,
  } as Session
}

const etat = (sessions: Session[]): AthleteState =>
  ({
    profile: {} as AthleteState['profile'],
    sessions,
    weights: [],
    measures: [],
    photos: [],
    wellness: [],
    benchmarks: {} as AthleteState['benchmarks'],
    records: [],
    goals: [],
    limitations: [],
  }) as AthleteState

describe('calendrier', () => {
  it('produit un fichier valide et clos', () => {
    const ics = calendrierIcs(etat([seance()]), JOUR)
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics.split('BEGIN:VEVENT').length - 1).toBe(1)
  })

  it('sépare les lignes par CRLF, comme l’exige le format', () => {
    const ics = calendrierIcs(etat([seance()]), JOUR)
    expect(/[^\r]\n/.test(ics)).toBe(false)
  })

  it('place la séance en journée entière, fin exclusive au lendemain', () => {
    const ics = calendrierIcs(etat([seance({ date: '2026-09-07' })]), JOUR)
    expect(ics).toContain('DTSTART;VALUE=DATE:20260907')
    expect(ics).toContain('DTEND;VALUE=DATE:20260908')
  })

  it('marque ce qui est fait et annule ce qui est sauté', () => {
    const ics = calendrierIcs(
      etat([seance({ id: 'a', status: 'done' }), seance({ id: 'b', date: '2026-09-08', status: 'skipped' })]),
      JOUR,
    )
    expect(ics).toContain('SUMMARY:✓ Footing 8 km · 40 min')
    expect(ics).toContain('STATUS:CANCELLED')
  })

  it('échappe les caractères réservés du format', () => {
    const ics = calendrierIcs(etat([seance({ title: 'Force ; haut, bas' })]), JOUR)
    expect(ics).toContain('SUMMARY:Force \\; haut\\, bas · 40 min')
  })

  it('plie les lignes trop longues sans couper un caractère accentué', () => {
    const ics = calendrierIcs(etat([seance({ title: 'é'.repeat(80) })]), JOUR)
    const lignes = ics.split('\r\n')
    for (const l of lignes) expect(Buffer.from(l, 'utf8').length).toBeLessThanOrEqual(75)
    // Le titre se reconstitue une fois le pliage defait.
    expect(ics.replace(/\r\n /g, '')).toContain('é'.repeat(80))
  })

  it('garde un identifiant stable d’une lecture à l’autre', () => {
    const e = etat([seance({ id: 'stable-1' })])
    expect(calendrierIcs(e, JOUR)).toBe(calendrierIcs(e, JOUR))
    expect(calendrierIcs(e, JOUR)).toContain('UID:stable-1@hybrid')
  })

  it('ignore ce qui est trop ancien mais garde le passé récent', () => {
    const ics = calendrierIcs(
      etat([
        seance({ id: 'vieux', date: '2026-01-01' }),
        seance({ id: 'recent', date: '2026-08-20' }),
      ]),
      JOUR,
    )
    expect(ics).not.toContain('UID:vieux@')
    expect(ics).toContain('UID:recent@')
  })

  it('décrit la séance sans rien inventer', () => {
    const ics = calendrierIcs(
      etat([
        seance({
          goal: 'Endurance fondamentale',
          target: '8 km à 6:00/km',
          exercises: [{ n: 'Tractions', sets: 4, reps: '8', rest: 120, rir: 2, cue: '' }],
        }),
      ]),
      JOUR,
    )
    const desc = ics.split('\r\n').find((l) => l.startsWith('DESCRIPTION:'))
    expect(desc).toBeDefined()
    expect(ics.replace(/\r\n /g, '')).toContain('Cible : 8 km à 6:00/km')
    expect(ics.replace(/\r\n /g, '')).toContain('Tractions — 4 × 8')
  })
})
