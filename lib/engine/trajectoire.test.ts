import { describe, expect, it } from 'vitest'
import { surHorizon, trajectoire } from './trajectoire'
import type { AthleteState, ISODate, Session } from './types'

/** Lundi 7 septembre 2026. */
const JOUR: ISODate = '2026-09-09'

const sortie = (date: ISODate, km: number, week: number, status: Session['status'] = 'done'): Session =>
  ({
    id: `${date}-${km}`,
    date,
    type: 'RUN',
    kind: 'run',
    status,
    week,
    title: 'Course',
    cues: [],
    duration: 40,
    intensity: 2,
    exercises: [],
    log: { km, minutes: 40 },
  }) as Session

const etat = (sessions: Session[], baseWeeklyKm: number | null = 18): AthleteState =>
  ({
    profile: { sports: ['running', 'swimming', 'strength'], baseWeeklyKm, allowDoubles: false },
    sessions,
    weights: [],
    measures: [],
    photos: [],
    wellness: [],
    benchmarks: {},
    records: [],
    goals: [
      { id: 'g', type: 'marathon', priority: 'principal', status: 'actif', targetDate: null, targetValue: null, targetUnit: null, note: null },
    ],
    limitations: [],
  }) as unknown as AthleteState

const histoire = [
  sortie('2026-08-18', 6, 1),
  sortie('2026-08-20', 5, 1),
  sortie('2026-08-25', 7, 2),
  sortie('2026-08-27', 5, 2),
  sortie('2026-09-01', 8, 3),
  sortie('2026-09-03', 6, 3),
]

describe('trajectoire', () => {
  it('joint le passé mesuré et l’avenir prescrit en une seule série', () => {
    const t = trajectoire(etat(histoire), JOUR, { avant: 4, apres: 6 })
    expect(t.points.slice(0, t.bascule).every((p) => p.reel)).toBe(true)
    expect(t.points.slice(t.bascule).every((p) => !p.reel)).toBe(true)
    expect(t.points).toHaveLength(t.bascule + 6)
  })

  it('mesure le passé sur les séances enregistrées', () => {
    const t = trajectoire(etat(histoire), JOUR, { avant: 4, apres: 4 })
    const semaineDu25 = t.points.find((p) => p.lundi === '2026-08-24')
    expect(semaineDu25?.km).toBe(12)
    expect(semaineDu25?.reel).toBe(true)
  })

  it('ne remonte pas avant la première séance : on n’observait rien', () => {
    const t = trajectoire(etat([sortie('2026-09-01', 8, 3)]), JOUR, { avant: 12, apres: 4 })
    // Une seule semaine close depuis la premiere seance.
    expect(t.bascule).toBeLessThanOrEqual(1)
  })

  it('projette la semaine en cours plutôt que de la mesurer à moitié', () => {
    const t = trajectoire(etat(histoire), JOUR, { avant: 4, apres: 4 })
    // Le lundi de la semaine en cours ouvre la partie projetee.
    expect(t.points[t.bascule]?.lundi).toBe('2026-09-07')
    expect(t.points[t.bascule]?.reel).toBe(false)
  })

  it('s’ancre sur le volume mesuré quand l’historique le permet', () => {
    const t = trajectoire(etat(histoire), JOUR, { avant: 4, apres: 4 })
    expect(t.ancree).toBe(true)
    // Six sorties, 37 km sur 28 jours : le depart doit rester du meme ordre,
    // et surtout pas repartir du volume declare a l'inscription.
    expect(t.depart).toBeLessThan(20)
  })

  it('marque les semaines de décharge', () => {
    const t = trajectoire(etat(histoire), JOUR, { avant: 0, apres: 8 })
    const decharges = t.points.filter((p) => p.decharge)
    expect(decharges.length).toBeGreaterThan(0)
    // Une decharge est un creux : elle court moins que la semaine d'avant.
    for (const d of decharges) {
      const i = t.points.indexOf(d)
      if (i > 0) expect(d.km).toBeLessThan(t.points[i - 1]!.km)
    }
  })

  it('totalise ce que le plan fait courir d’ici l’horizon', () => {
    const t = trajectoire(etat(histoire), JOUR, { avant: 4, apres: 6 })
    const somme = t.points.slice(t.bascule).reduce((a, p) => a + p.km, 0)
    expect(t.kmAVenir).toBe(Math.round(somme))
  })

  it('date les paliers que la sortie longue atteint', () => {
    const t = trajectoire(etat(histoire), JOUR, { avant: 4, apres: 40 })
    expect(t.paliers.length).toBeGreaterThan(0)
    // Ils sont dans l'ordre, et chacun est date d'un lundi a venir.
    for (let i = 1; i < t.paliers.length; i++) {
      expect(t.paliers[i]!.km).toBeGreaterThan(t.paliers[i - 1]!.km)
      expect(t.paliers[i]!.quand >= t.paliers[i - 1]!.quand).toBe(true)
    }
  })

  it('nomme les distances qui ont un nom', () => {
    // Il faut un volume qui permette d'y arriver : le plafond de volume
    // borne la sortie longue, et un coureur a dix kilometres par semaine
    // n'atteint jamais le semi, ce que la trajectoire dit sans le farder.
    const costaud = Array.from({ length: 16 }, (_, i) =>
      sortie(addJours('2026-08-12', i * 2), 12, 12),
    )
    const t = trajectoire(etat(costaud, 40), JOUR, { avant: 0, apres: 60 })
    const semi = t.paliers.find((p) => p.km === 21.1)
    expect(semi?.nom).toBe('semi-marathon')
  })

  it('n’annonce pas un palier que le plafond de volume rend inatteignable', () => {
    // Neuf kilometres par semaine mesures : le plafond borne la sortie longue
    // bien avant le semi. Le promettre serait une invention.
    const t = trajectoire(etat(histoire), JOUR, { avant: 0, apres: 60 })
    expect(t.paliers.some((p) => p.km === 42.2)).toBe(false)
  })

  it('n’annonce pas un palier déjà dépassé', () => {
    // Un coureur a 60 km par semaine passe les dix kilometres depuis
    // longtemps : le lui annoncer serait du bruit, pas une nouvelle.
    const gros = Array.from({ length: 12 }, (_, i) =>
      sortie(addJours('2026-08-10', i * 2), 20, 20),
    )
    const t = trajectoire(etat(gros, 60), JOUR, { avant: 4, apres: 12 })
    expect(t.paliers.some((p) => p.km === 5)).toBe(false)
  })

  it('ne casse pas sur un compte sans aucune séance', () => {
    const t = trajectoire(etat([]), JOUR, { avant: 8, apres: 12 })
    expect(t.bascule).toBe(0)
    expect(t.points).toHaveLength(12)
    expect(t.ancree).toBe(false)
  })
})

function addJours(d: string, n: number): ISODate {
  const t = new Date(d)
  t.setDate(t.getDate() + n)
  return t.toISOString().slice(0, 10)
}

describe('changement d’horizon', () => {
  const complet = trajectoire(etat(histoire), JOUR, { avant: 4, apres: 52 })

  it('découpe sans recalculer', () => {
    const court = surHorizon(complet, 8)
    expect(court.points).toHaveLength(complet.bascule + 8)
    // Une semaine vaut la meme chose quel que soit l'horizon regarde.
    for (let i = 0; i < court.points.length; i++) {
      expect(court.points[i]!.km).toBe(complet.points[i]!.km)
    }
  })

  it('recalcule l’arrivée et le total sur la découpe', () => {
    const court = surHorizon(complet, 6)
    expect(court.arrivee).toBe(court.points[court.points.length - 1]!.km)
    expect(court.kmAVenir).toBeLessThan(complet.kmAVenir)
  })

  it('ne garde que les paliers atteints dans l’horizon', () => {
    const court = surHorizon(complet, 4)
    for (const p of court.paliers) {
      expect(p.semaine).toBeLessThanOrEqual(court.points[court.points.length - 1]!.semaine)
    }
    expect(court.paliers.length).toBeLessThanOrEqual(complet.paliers.length)
  })
})
