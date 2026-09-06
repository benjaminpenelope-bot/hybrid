import { describe, expect, it } from 'vitest'
import { vitesseMaximale, weightTrend } from './body'
import { computeAlerts } from './alerts'
import { computeGoals, LIBELLE_OBJECTIF } from './goals'
import { facteurDePlafond, generatePlan, microcycleDe, doserPourObjectif, buildStrength, weekVolume, PLAFOND_KM } from './program'
import type { AthleteState, ISODate, Profile, WeightEntry } from './types'

const JOUR: ISODate = '2026-09-06'

function profil(over: Partial<Profile> = {}): Profile {
  return {
    name: 'Test',
    startWeight: 80,
    goalWeight: 74,
    programStart: '2026-06-01',
    restWeekday: 1,
    allowDoubles: false,
    sports: ['running', 'strength'],
    availableWeekdays: [],
    ...over,
  } as Profile
}

function etat(p: Profile, weights: WeightEntry[] = []): AthleteState {
  return {
    profile: p,
    sessions: [],
    weights,
    measures: [],
    photos: [],
    wellness: [],
    benchmarks: {} as AthleteState['benchmarks'],
    records: [],
    goals: [],
    limitations: [],
  }
}

describe('les deux objectifs existent à part entière', () => {
  it('sont nommés', () => {
    expect(LIBELLE_OBJECTIF.perte_de_poids).toBe('Perte de poids')
    expect(LIBELLE_OBJECTIF.prise_de_masse).toBe('Prise de masse')
  })

  it('la prise de masse ne partage pas la semaine de l’hypertrophie', () => {
    // Les deux coexistent : c'est justement la repartition qui les separe,
    // la prise de masse protegeant davantage la recuperation.
    expect(microcycleDe('prise_de_masse')).not.toEqual(microcycleDe('hypertrophie'))
  })

  it('la prise de masse tient quatre séances de barre et deux repos', () => {
    const micro = Object.values(microcycleDe('prise_de_masse'))
    expect(micro.filter((t) => t === 'UPPER' || t === 'LOWER')).toHaveLength(4)
    expect(micro.filter((t) => t === 'REST')).toHaveLength(2)
    expect(micro.filter((t) => t === 'RUN' || t === 'LONG')).toHaveLength(1)
  })

  it('la perte de poids garde la barre, et ne se réduit pas à du cardio', () => {
    const micro = Object.values(microcycleDe('perte_de_poids'))
    expect(micro.filter((t) => t === 'UPPER' || t === 'LOWER').length).toBeGreaterThanOrEqual(3)
    expect(micro.filter((t) => t === 'RUN' || t === 'LONG')).toHaveLength(3)
  })

  it('la perte de poids laisse deux répétitions en réserve, l’hypertrophie une', () => {
    const serie = buildStrength('UPPER', 4).find((e) => !e.test)!
    const perte = doserPourObjectif([serie], 'perte_de_poids')[0]!
    const masse = doserPourObjectif([serie], 'prise_de_masse')[0]!
    expect(perte.rir).toBe(2)
    expect(masse.rir).toBe(1)
  })
})

describe('course d’entretien', () => {
  it('la prise de masse ne laisse pas le volume tripler', () => {
    expect(facteurDePlafond('prise_de_masse')).toBeLessThan(facteurDePlafond('marathon'))
  })

  it('tout autre objectif garde le plafond d’origine', () => {
    expect(facteurDePlafond('perte_de_poids')).toBe(facteurDePlafond(null))
    expect(facteurDePlafond('marathon')).toBe(3)
  })

  it('le volume plafonne vraiment', () => {
    const base = 20
    const plafond = Math.min(base * facteurDePlafond('prise_de_masse'), PLAFOND_KM)
    // Semaine 41, et non 40 : une semaine sur quatre est une decharge, et le
    // plafond s'applique avant elle. La tester la reviendrait a mesurer la
    // decharge plutot que le plafond.
    expect(weekVolume(41, base, plafond)).toBeLessThanOrEqual(plafond)
    expect(weekVolume(41, base, plafond)).toBeGreaterThan(base)
    // Sans le facteur d'entretien, la meme semaine partirait bien plus haut.
    expect(weekVolume(41, base, base * 3)).toBeGreaterThan(plafond * 2)
  })

  it('le plan de prise de masse court bien moins que celui de marathon, à base égale', () => {
    // La distance est dans le titre de la seance : « Footing souple — 7 km ».
    const km = (goal: 'prise_de_masse' | 'marathon') =>
      generatePlan('2026-09-07', 1, 30, { goal, baseKm: 20, sports: ['running', 'strength'] })
        .reduce((t, s) => t + (Number.parseFloat(s.title.match(/([\d.,]+)\s*km/)?.[1]?.replace(',', '.') ?? '0') || 0), 0)
    const masse = km('prise_de_masse')
    const marathon = km('marathon')
    expect(masse).toBeGreaterThan(0)
    expect(masse).toBeLessThan(marathon / 5)
  })

  it('donne quand même quatre séances de barre à la prise de masse', () => {
    const plan = generatePlan('2026-09-07', 1, 30, {
      goal: 'prise_de_masse',
      baseKm: 20,
      sports: ['running', 'strength'],
    })
    expect(plan.filter((s) => s.type === 'UPPER' || s.type === 'LOWER')).toHaveLength(4)
    expect(plan.filter((s) => s.type === 'REST')).toHaveLength(2)
  })
})

describe('vitesse de variation du poids', () => {
  it('une perte se juge en part du poids de corps', () => {
    // 0,75 % de 80 kg = 0,6 kg par semaine.
    expect(vitesseMaximale(80, true)).toBeCloseTo(0.6, 2)
    expect(vitesseMaximale(50, true)).toBeCloseTo(0.375, 3)
  })

  it('une prise reste bornée en kilos absolus', () => {
    expect(vitesseMaximale(80, false)).toBe(0.25)
    expect(vitesseMaximale(50, false)).toBe(0.25)
  })

  it('ne signale pas comme trop rapide une perte parfaitement saine', () => {
    // 0,4 kg par semaine a 80 kg : sous le seuil. L'ancienne regle, calee sur
    // 0,25 kg, l'aurait alertee a tort.
    const s = etat(profil(), [
      { date: '2026-08-23', kg: 80 },
      { date: '2026-09-06', kg: 79.2 },
    ])
    expect(weightTrend(s, JOUR).tooFast).toBe(false)
  })

  it('signale une perte réellement trop rapide', () => {
    const s = etat(profil(), [
      { date: '2026-08-23', kg: 80 },
      { date: '2026-09-06', kg: 77.5 },
    ])
    const t = weightTrend(s, JOUR)
    expect(t.perte).toBe(true)
    expect(t.tooFast).toBe(true)
  })

  it('ne confond pas une reprise avec une perte trop rapide', () => {
    const s = etat(profil(), [
      { date: '2026-08-23', kg: 78 },
      { date: '2026-09-06', kg: 80 },
    ])
    expect(weightTrend(s, JOUR).tooFast).toBe(false)
  })

  it('garde le seuil de la prise quand la cible est au-dessus du départ', () => {
    const s = etat(profil({ startWeight: 70, goalWeight: 76 }), [
      { date: '2026-08-23', kg: 70 },
      { date: '2026-09-06', kg: 71 },
    ])
    const t = weightTrend(s, JOUR)
    expect(t.perte).toBe(false)
    expect(t.vitesseMax).toBe(0.25)
    expect(t.tooFast).toBe(true)
  })
})

describe('signal de vitesse', () => {
  const alerte = (s: AthleteState) => computeAlerts(s, JOUR).find((a) => a.id === 'weight_rate')

  it('nomme le bon sens', () => {
    const s = etat(profil(), [
      { date: '2026-08-23', kg: 80 },
      { date: '2026-09-06', kg: 77.5 },
    ])
    expect(alerte(s)?.title).toBe('Perte de poids trop rapide')
    expect(alerte(s)?.body).toContain('repères de force')
  })

  it('se tait sur une perte saine', () => {
    const s = etat(profil(), [
      { date: '2026-08-23', kg: 80 },
      { date: '2026-09-06', kg: 79.2 },
    ])
    expect(alerte(s)).toBeUndefined()
  })
})

describe('jalons', () => {
  it('la perte de poids suit d’abord ce que la balance ne dit pas', () => {
    const s = etat(profil())
    s.goals = [
      { id: '1', type: 'perte_de_poids', priority: 'principal', status: 'actif', targetDate: null, targetValue: null, targetUnit: null, note: null },
    ]
    const labels = computeGoals(s, JOUR).map((g) => g.label)
    expect(labels.some((l) => l.includes('tractions'))).toBe(true)
    // Le poids cible vient des jalons universels : il n'est pas double.
    expect(labels.filter((l) => l === '74 kg')).toHaveLength(1)
  })
})
