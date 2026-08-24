import { describe, expect, it } from 'vitest'
import { emptyState } from '../seed-data'
import { GAIN_MAX_KG_SEMAINE, weightTrend } from './body'
import { addDays } from './date'
import type { AthleteState } from './types'

const TODAY = '2026-03-16'

function withWeights(kgs: { date: string; kg: number }[]): AthleteState {
  const base = emptyState(TODAY)
  return {
    ...base,
    profile: { ...base.profile, startWeight: 70, goalWeight: 76 },
    weights: kgs.map((w) => ({ ...w, source: 'manual' as const })),
  }
}

describe('weightTrend', () => {
  it('ne calcule aucune vitesse sur une seule pesée', () => {
    // Un point ne fait pas une tendance : afficher 0 kg/sem serait inventer.
    expect(weightTrend(withWeights([{ date: TODAY, kg: 71 }]), TODAY).rate).toBeNull()
  })

  it('ne calcule aucune vitesse sur deux pesées trop rapprochées', () => {
    const s = withWeights([
      { date: addDays(TODAY, -3), kg: 70 },
      { date: TODAY, kg: 71 },
    ])
    // 1 kg en trois jours extrapolé donnerait 2,3 kg/sem : un artefact, pas une mesure.
    expect(weightTrend(s, TODAY).rate).toBeNull()
  })

  it('calcule la vitesse dès deux pesées espacées d une semaine', () => {
    const s = withWeights([
      { date: addDays(TODAY, -14), kg: 70 },
      { date: TODAY, kg: 71 },
    ])
    expect(weightTrend(s, TODAY).rate).toBeCloseTo(0.5, 5)
  })

  it('ignore les pesées sorties de la fenêtre de 28 jours', () => {
    const s = withWeights([
      { date: addDays(TODAY, -60), kg: 60 },
      { date: addDays(TODAY, -10), kg: 70 },
      { date: TODAY, kg: 71 },
    ])
    // La pesée à 60 kg fausserait tout : la vitesse se lit sur 10 jours, pas 60.
    expect(weightTrend(s, TODAY).rate).toBeCloseTo(0.7, 5)
  })

  it('alerte au-dessus du seuil, dans le sens de l objectif', () => {
    const s = withWeights([
      { date: addDays(TODAY, -7), kg: 70 },
      { date: TODAY, kg: 71 },
    ])
    const trend = weightTrend(s, TODAY)
    expect(trend.rate).toBeGreaterThan(GAIN_MAX_KG_SEMAINE)
    expect(trend.tooFast).toBe(true)
  })

  it("n'alerte pas quand le poids part à l'opposé de l'objectif", () => {
    // Perdre du poids alors qu'on veut en prendre est un problème de programme,
    // pas une prise trop rapide : ce n'est pas cette alerte-là.
    const s = withWeights([
      { date: addDays(TODAY, -7), kg: 70 },
      { date: TODAY, kg: 68 },
    ])
    expect(weightTrend(s, TODAY).tooFast).toBe(false)
  })

  it('moyenne les pesées d une même semaine', () => {
    const s = withWeights([
      { date: '2026-03-16', kg: 70 },
      { date: '2026-03-18', kg: 72 },
    ])
    const { weekly } = weightTrend(s, TODAY)
    expect(weekly).toHaveLength(1)
    expect(weekly[0]?.kg).toBe(71)
  })

  it('retombe sur le poids de départ quand rien n a été pesé', () => {
    const trend = weightTrend(withWeights([]), TODAY)
    expect(trend.current).toBe(70)
    expect(trend.gain).toBe(0)
    expect(trend.rate).toBeNull()
  })
})
