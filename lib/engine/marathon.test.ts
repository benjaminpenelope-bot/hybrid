import { describe, expect, it } from 'vitest'
import { emptyState, seedState } from '../seed-data'
import { addDays } from './date'
import {
  calendarAssessment,
  marathonVerdict,
  PHASE_TARGETS,
  targetPaceLabel,
} from './marathon'
import type { AthleteState, Session } from './types'

const TODAY = '2026-03-16'

const run = (date: string, km: number, minutes: number): Session => ({
  id: `r-${date}-${km}`,
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
  log: { km, minutes },
  rpe: 5,
})

const withRuns = (sessions: Session[]): AthleteState => ({
  ...emptyState(TODAY),
  sessions,
})

describe('targetPace', () => {
  it('rend 5:41/km pour un marathon sous 4 h', () => {
    expect(targetPaceLabel(240)).toBe('5:41')
  })

  it('suit le chrono visé', () => {
    expect(targetPaceLabel(270)).toBe('6:24')
  })
})

describe('marathonVerdict', () => {
  it('refuse de dire ce qui manque tant que l allure est inconnue', () => {
    const v = marathonVerdict(emptyState(TODAY), TODAY, 'BASE')
    expect(v.gap).toBe('inconnu')
    expect(v.ready).toBe(false)
    expect(v.detail).toContain("n'a pas encore été mesurée")
    // surtout pas la phrase du prototype, qui affirmerait sans savoir
    expect(v.detail).not.toContain('pas la vitesse')
  })

  it('dit qu il manque le volume quand l allure tient déjà', () => {
    // 5 km à 5:00/km : plus rapide que les 5:41 visés
    const v = marathonVerdict(withRuns([run(addDays(TODAY, -2), 5, 25)]), TODAY, 'BASE')
    expect(v.gap).toBe('volume')
    expect(v.detail).toContain('il te manque le volume, pas la vitesse')
  })

  it('dit qu il manque la vitesse quand le volume est là', () => {
    const sessions = [
      run(addDays(TODAY, -6), 35, 280),
      run(addDays(TODAY, -2), 33, 264), // 8:00/km, bien plus lent que la cible
    ]
    const v = marathonVerdict(withRuns(sessions), TODAY, 'SPECIFIC')
    expect(v.gap).toBe('vitesse')
    expect(v.detail).toContain('5:41')
  })

  it('reconnaît un athlète prêt', () => {
    const sessions = [
      run(addDays(TODAY, -6), 35, 190),
      run(addDays(TODAY, -2), 33, 180),
    ]
    const v = marathonVerdict(withRuns(sessions), TODAY, 'SPECIFIC')
    expect(v.ready).toBe(true)
    expect(v.headline).not.toContain("pas en état")
  })

  it('reprend les cibles de la phase en cours', () => {
    const v = marathonVerdict(seedState(TODAY), TODAY, 'BASE')
    expect(v.detail).toContain(`${PHASE_TARGETS.BASE.weeklyKm} km par semaine`)
    expect(v.detail).toContain(`${PHASE_TARGETS.BASE.longestKm} km de sortie longue`)
  })
})

describe('calendarAssessment', () => {
  it('exige une allure mesurée avant de trancher', () => {
    const { paragraphs } = calendarAssessment(
      emptyState(TODAY),
      TODAY,
      emptyState(TODAY).profile,
      null,
    )
    expect(paragraphs[0]?.emphasis).toContain('Impossible de trancher')
  })

  it('chiffre le conflit entre prise de poids et chrono', () => {
    const state = seedState(TODAY)
    const { paragraphs } = calendarAssessment(state, TODAY, state.profile, null)
    const conflict = paragraphs.find((p) => p.emphasis.includes('Conflit'))
    // 83 kg vers 88 kg : +5 kg, soit +6 % de masse
    expect(conflict?.emphasis).toContain('5 kg')
    expect(conflict?.text).toContain('+6 %')
    expect(conflict?.warn).toBe(true)
  })

  it('ne parle pas de conflit sans prise de poids visée', () => {
    const base = seedState(TODAY)
    const state: AthleteState = {
      ...base,
      profile: { ...base.profile, goalWeight: base.profile.startWeight },
    }
    const { paragraphs } = calendarAssessment(state, TODAY, state.profile, null)
    expect(paragraphs.some((p) => p.emphasis.includes('Conflit'))).toBe(false)
  })

  it('dit franchement quand le calendrier est trop court', () => {
    const state = seedState(TODAY)
    const { paragraphs } = calendarAssessment(state, TODAY, state.profile, 10)
    const last = paragraphs[paragraphs.length - 1]
    expect(last?.text).toContain('trop court')
    expect(last?.warn).toBe(true)
  })
})
