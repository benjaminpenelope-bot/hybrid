import { describe, expect, it } from 'vitest'
import {
  estRejet,
  mapActivity,
  matchSession,
  type ActiviteImportee,
  type StravaActivity,
} from './activity'

function activite(over: Partial<StravaActivity> = {}): StravaActivity {
  return {
    id: 1234,
    name: 'Footing du matin',
    type: 'Run',
    start_date_local: '2026-03-16T07:12:00Z',
    distance: 8040,
    moving_time: 2580,
    elapsed_time: 2650,
    total_elevation_gain: 62,
    ...over,
  }
}

/** Raccourci : mapActivity en supposant que l'activité passe. */
function importee(over: Partial<StravaActivity> = {}): ActiviteImportee {
  const r = mapActivity(activite(over))
  if (estRejet(r)) throw new Error(`rejetée : ${r.raison}`)
  return r
}

describe('mapActivity', () => {
  it('reprend les mesures d une course', () => {
    const r = importee()
    expect(r.date).toBe('2026-03-16')
    expect(r.kind).toBe('run')
    expect(r.log.km).toBe(8.04)
    expect(r.log.minutes).toBe(43)
    expect(r.log.elev).toBe(62)
  })

  it("n'invente jamais le RPE", () => {
    // Strava mesure une allure, pas un ressenti. Le déduire serait inventer.
    const r = importee()
    expect(r.rpe).toBeNull()
    expect(r.aCompleter).toContain('ressenti (RPE)')
  })

  it("reprend le RPE quand l'athlète l'a noté lui-même", () => {
    const r = importee({ perceived_exertion: 7 })
    expect(r.rpe).toBe(7)
    expect(r.aCompleter).not.toContain('ressenti (RPE)')
  })

  it('ignore un RPE hors des bornes de l échelle', () => {
    expect(importee({ perceived_exertion: 0 }).rpe).toBeNull()
    expect(importee({ perceived_exertion: 42 }).rpe).toBeNull()
  })

  it('laisse la fréquence cardiaque à null quand elle manque', () => {
    expect(importee().log.hr).toBeNull()
    expect(importee({ average_heartrate: 152.4 }).log.hr).toBe(152)
  })

  it('ne déduit jamais le continu depuis une distance nagée', () => {
    // 800 m nagés en 16 longueurs entrecoupées ne valent pas 800 m en continu.
    // C'est ce repère qui fixe la note de natation : le fabriquer la fausserait.
    const r = importee({ type: 'Swim', distance: 800, moving_time: 1500 })
    expect(r.kind).toBe('swim')
    expect(r.log.distance).toBe(800)
    expect(r.log.continuous).toBeNull()
    expect(r.log.stroke).toBeNull()
    expect(r.aCompleter).toContain('mètres nagés en continu')
  })

  it('ne déduit ni séries ni répétitions sur une séance de force', () => {
    const r = importee({ type: 'WeightTraining', distance: 0, moving_time: 3000 })
    expect(r.kind).toBe('strength')
    expect(r.log.minutes).toBe(50)
    expect(r.log.sets).toBeUndefined()
    expect(r.aCompleter).toContain('séries et répétitions')
  })

  it('préfère sport_type à type quand les deux sont là', () => {
    expect(importee({ type: 'Run', sport_type: 'TrailRun' }).kind).toBe('run')
    const r = mapActivity(activite({ type: 'Run', sport_type: 'Ride' }))
    expect(estRejet(r)).toBe(true)
  })

  it('écarte un type hors programme en disant pourquoi', () => {
    const r = mapActivity(activite({ type: 'Ride' }))
    expect(estRejet(r) && r.raison).toContain('Ride')
  })

  it('écarte une activité sans durée', () => {
    const r = mapActivity(activite({ moving_time: 0 }))
    expect(estRejet(r) && r.raison).toContain('Durée')
  })

  it('remplace un nom vide par un libellé neutre', () => {
    expect(importee({ name: '   ' }).title).toBe('Activité Strava')
  })
})

describe('matchSession', () => {
  const seances = [
    { id: 'a', date: '2026-03-16', kind: 'run' as const, status: 'planned' },
    { id: 'b', date: '2026-03-16', kind: 'swim' as const, status: 'planned' },
    { id: 'c', date: '2026-03-15', kind: 'run' as const, status: 'planned' },
  ]

  it('retient la séance du même jour et de la même discipline', () => {
    expect(matchSession(importee(), seances)?.id).toBe('a')
  })

  it('ne touche pas une séance déjà validée', () => {
    const dejaFaite = seances.map((s) => (s.id === 'a' ? { ...s, status: 'done' } : s))
    // Écraser une séance validée effacerait un RPE réellement saisi.
    expect(matchSession(importee(), dejaFaite)).toBeNull()
  })

  it('ne rapproche pas deux disciplines différentes', () => {
    const nage = importee({ type: 'Swim', start_date_local: '2026-03-15T07:00:00Z' })
    expect(matchSession(nage, seances)).toBeNull()
  })

  it('ne rapproche pas une activité d un autre jour', () => {
    const veille = importee({ start_date_local: '2026-03-10T07:00:00Z' })
    expect(matchSession(veille, seances)).toBeNull()
  })
})
