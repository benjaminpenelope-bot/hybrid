import { describe, expect, it } from 'vitest'
import { generatePlan, microcycleDe, microcycleEffectif, slotFor, type Slot } from './program'
import { restWeekdayFrom } from '../validation/onboarding'
import { weekday } from './date'
import type { GoalType, Sport } from './types'

/** Ce que l'apercu de l'inscription affiche, reproduit a l'identique. */
function apercu(goal: GoalType, sports: Sport[], jours: number[]) {
  const micro = microcycleEffectif(microcycleDe(goal), sports)
  const repos = restWeekdayFrom(jours)
  return [1, 2, 3, 4, 5, 6, 0].map((n) =>
    !jours.includes(n) ? 'REST' : micro[slotFor(n, repos) as Slot],
  )
}

describe('apercu conforme au plan genere', () => {
  it('annonce exactement la semaine que le generateur produit', () => {
    const cas: [GoalType, Sport[], number[]][] = [
      ['marathon', ['running', 'swimming', 'street_workout'], [1, 2, 3, 4, 5, 6]],
      ['force', ['strength'], [2, 3, 5, 6]],
      ['hyrox', ['running', 'strength'], [1, 2, 4, 5, 6, 0]],
      ['endurance', ['cycling'], [1, 3, 5, 0]],
    ]
    for (const [goal, sports, jours] of cas) {
      const plan = generatePlan('2026-03-16', 1, 1, {
        restWeekday: restWeekdayFrom(jours),
        sports,
        availableWeekdays: jours,
        goal,
        makeId: (() => { let i = 0; return () => `t${++i}` })(),
      })
      const reel = [1, 2, 3, 4, 5, 6, 0].map(
        (n) => plan.find((s) => weekday(s.date) === n)!.type,
      )
      expect(apercu(goal, sports, jours)).toEqual(reel)
    }
  })
})
