import { describe, expect, it } from 'vitest'
import { dureeAffichee, dureeDeLaSeance, dureeEnTexte } from './duree'
import type { Session } from './types'

const seance = (over: Partial<Session>): Session =>
  ({
    id: 'x',
    date: '2026-09-09',
    type: 'RUN',
    kind: 'run',
    status: 'planned',
    week: 3,
    title: 'Endurance fondamentale',
    cues: [],
    duration: 31,
    intensity: 2,
    exercises: [],
    ...over,
  }) as Session

describe('durée d’une séance', () => {
  it('préfère la mesure à la prévision', () => {
    // Le cas reel : 5,5 km courus en 36 minutes, un plan qui en prevoyait 31.
    const d = dureeDeLaSeance(seance({ status: 'done', log: { km: 5.5, minutes: 36 } }))
    expect(d).toEqual({ minutes: 36, mesuree: true })
  })

  it('retombe sur la prévision quand rien n’a été enregistré', () => {
    expect(dureeDeLaSeance(seance({}))).toEqual({ minutes: 31, mesuree: false })
  })

  it('ne prend pas un zéro enregistré pour une mesure', () => {
    // Zero minute n'est pas une seance : c'est un champ laisse vide.
    expect(dureeDeLaSeance(seance({ log: { minutes: 0 } })).mesuree).toBe(false)
  })

  it('ignore une valeur non numérique', () => {
    expect(dureeDeLaSeance(seance({ log: { minutes: null } })).mesuree).toBe(false)
  })
})

describe('mise en forme', () => {
  it('écrit les minutes rondes sans secondes', () => {
    expect(dureeEnTexte(45)).toBe("45'")
  })

  it('écrit le chrono quand il y a des secondes', () => {
    expect(dureeEnTexte(36 + 40 / 60)).toBe('36:40')
  })

  it('ne perd pas une seconde dans l’arrondi', () => {
    // 36 + 40/60 vaut 36,666666666666664 : un arrondi naif rendrait 36:39.
    for (let s = 0; s < 60; s++) {
      const attendu = s === 0 ? "36'" : `36:${String(s).padStart(2, '0')}`
      expect(dureeEnTexte(36 + s / 60)).toBe(attendu)
    }
  })

  it('n’invente rien sans durée', () => {
    expect(dureeEnTexte(0)).toBe('—')
    expect(dureeEnTexte(Number.NaN)).toBe('—')
  })

  it('affiche la séance faite avec son chrono réel', () => {
    expect(
      dureeAffichee(seance({ status: 'done', log: { km: 5.5, minutes: 36 + 40 / 60 } })),
    ).toBe('36:40')
  })
})
