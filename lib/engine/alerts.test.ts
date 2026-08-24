import { describe, expect, it } from 'vitest'
import { emptyState, seedState } from '../seed-data'
import { computeAlerts, topAlert } from './alerts'
import { addDays } from './date'
import type { AlertId } from './alerts'
import type { AthleteState, Session } from './types'

const TODAY = '2026-03-16'

const idsOf = (s: AthleteState): AlertId[] => computeAlerts(s, TODAY).map((a) => a.id)
const find = (s: AthleteState, id: AlertId) => computeAlerts(s, TODAY).find((a) => a.id === id)

function run(date: string, km: number, minutes: number, rpe: number): Session {
  return {
    id: `r-${date}`,
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
    rpe,
  }
}

function swim(date: string, continuous: number): Session {
  return {
    id: `w-${date}`,
    date,
    type: 'SWIM',
    kind: 'swim',
    status: 'done',
    week: 1,
    title: 'Piscine',
    cues: [],
    duration: 45,
    intensity: 2,
    exercises: [],
    log: { minutes: 45, continuous },
    rpe: 4,
  }
}

describe('couverture des règles', () => {
  it('ne déclenche aucun signal sans donnée, hors repères manquants', () => {
    expect(idsOf(emptyState(TODAY))).toEqual(['benchmarks_missing'])
  })

  it('adosse chaque signal à une donnée affichable', () => {
    const s = seedState(TODAY)
    for (const a of computeAlerts(s, TODAY)) {
      expect(a.evidence.length).toBeGreaterThan(0)
      expect(a.body.length).toBeGreaterThan(0)
    }
  })
})

describe('ratio de charge', () => {
  it('ne se déclenche pas tant que l historique est trop court', () => {
    // cinq jours de données : aucun ratio ne peut être significatif
    expect(idsOf(seedState(TODAY))).not.toContain('acwr')
  })

  it('passe en critique sur une hausse brutale avec un historique suffisant', () => {
    const sessions: Session[] = []
    for (let i = 28; i > 7; i--) sessions.push(run(addDays(TODAY, -i), 5, 30, 4))
    for (let i = 7; i >= 1; i--) sessions.push(run(addDays(TODAY, -i), 15, 90, 8))
    const s = { ...emptyState(TODAY), sessions }
    expect(find(s, 'acwr')?.level).toBe('critical')
  })
})

describe('jours consécutifs', () => {
  it('alerte à partir de six jours enchaînés', () => {
    const sessions = Array.from({ length: 6 }, (_, i) => run(addDays(TODAY, -(i + 1)), 5, 30, 5))
    expect(find({ ...emptyState(TODAY), sessions }, 'streak')?.level).toBe('warn')
  })

  it('passe en critique à huit jours', () => {
    const sessions = Array.from({ length: 9 }, (_, i) => run(addDays(TODAY, -(i + 1)), 5, 30, 5))
    expect(find({ ...emptyState(TODAY), sessions }, 'streak')?.level).toBe('critical')
  })
})

describe('douleur', () => {
  const s: AthleteState = {
    ...seedState(TODAY),
    wellness: [{ date: addDays(TODAY, -1), sleep: 7, fatigue: 5, soreness: 'genou droit' }],
  }

  it('remonte en tête des signaux', () => {
    expect(topAlert(computeAlerts(s, TODAY))?.id).toBe('pain')
  })

  it('ne pose aucun diagnostic et renvoie vers un professionnel', () => {
    const a = find(s, 'pain')!
    expect(a.body).toContain('aucun diagnostic')
    expect(a.body).toContain('professionnel de santé')
    expect(a.evidence).toContain('genou droit')
  })

  it('expire au bout de trois jours', () => {
    const old: AthleteState = {
      ...seedState(TODAY),
      wellness: [{ date: addDays(TODAY, -5), sleep: 7, fatigue: 5, soreness: 'genou droit' }],
    }
    expect(idsOf(old)).not.toContain('pain')
  })
})

describe('sommeil et fatigue', () => {
  it('alerte sous 6 h 30 de moyenne, à partir de deux relevés', () => {
    const one: AthleteState = {
      ...seedState(TODAY),
      wellness: [{ date: TODAY, sleep: 5 }],
    }
    expect(idsOf(one)).not.toContain('sleep')

    const two: AthleteState = {
      ...seedState(TODAY),
      wellness: [
        { date: TODAY, sleep: 5 },
        { date: addDays(TODAY, -1), sleep: 6 },
      ],
    }
    expect(find(two, 'sleep')?.level).toBe('warn')
  })

  it('alerte sur une fatigue à 8 ou plus', () => {
    const s: AthleteState = { ...seedState(TODAY), wellness: [{ date: TODAY, fatigue: 8 }] }
    expect(find(s, 'fatigue')?.level).toBe('warn')
  })

  it('ignore un relevé de fatigue trop ancien', () => {
    const s: AthleteState = {
      ...seedState(TODAY),
      wellness: [{ date: addDays(TODAY, -4), fatigue: 9 }],
    }
    expect(idsOf(s)).not.toContain('fatigue')
  })
})

describe('poids', () => {
  it('alerte au-delà de 0,25 kg par semaine', () => {
    const s: AthleteState = {
      ...seedState(TODAY),
      weights: [
        { date: addDays(TODAY, -14), kg: 83 },
        { date: TODAY, kg: 84.5 },
      ],
    }
    expect(find(s, 'weight_rate')?.level).toBe('warn')
    expect(find(s, 'weight_rate')?.evidence).toContain('kg / semaine')
  })

  it('reste muet sur une prise maîtrisée', () => {
    const s: AthleteState = {
      ...seedState(TODAY),
      weights: [
        { date: addDays(TODAY, -14), kg: 83 },
        { date: TODAY, kg: 83.4 },
      ],
    }
    expect(idsOf(s)).not.toContain('weight_rate')
  })

  it('ne conclut rien sur deux pesées du même jour', () => {
    const s: AthleteState = {
      ...seedState(TODAY),
      weights: [
        { date: TODAY, kg: 83 },
        { date: TODAY, kg: 85 },
      ],
    }
    expect(idsOf(s)).not.toContain('weight_rate')
  })
})

describe('volume de course', () => {
  it('alerte au-delà de +30 % d une semaine sur l autre', () => {
    const sessions = [
      run(addDays(TODAY, -10), 10, 60, 5),
      run(addDays(TODAY, -3), 20, 120, 6),
    ]
    expect(find({ ...emptyState(TODAY), sessions }, 'run_jump')?.level).toBe('warn')
  })

  it('reste muet sur une progression de 8 %', () => {
    const sessions = [
      run(addDays(TODAY, -10), 10, 60, 5),
      run(addDays(TODAY, -3), 10.8, 65, 5),
    ]
    expect(idsOf({ ...emptyState(TODAY), sessions })).not.toContain('run_jump')
  })
})

describe('natation', () => {
  it('signale une distance continue à l arrêt depuis trois semaines', () => {
    const sessions = [
      swim(addDays(TODAY, -30), 25),
      swim(addDays(TODAY, -20), 25),
      swim(addDays(TODAY, -5), 25),
    ]
    expect(find({ ...emptyState(TODAY), sessions }, 'swim_stagnation')?.level).toBe('info')
  })

  it('reste muet quand le palier vient d être passe', () => {
    const sessions = [
      swim(addDays(TODAY, -30), 25),
      swim(addDays(TODAY, -20), 25),
      swim(addDays(TODAY, -2), 50),
    ]
    expect(idsOf({ ...emptyState(TODAY), sessions })).not.toContain('swim_stagnation')
  })
})

describe('calendrier de course', () => {
  it('dit franchement quand le temps manque', () => {
    const s: AthleteState = {
      ...seedState(TODAY),
      profile: { ...seedState(TODAY).profile, raceDate: addDays(TODAY, 7 * 8) },
    }
    const a = find(s, 'race_feasibility')!
    expect(a.level).toBe('critical')
    expect(a.body).toContain('tronquée')
  })

  it('se tait quand le calendrier tient', () => {
    const s: AthleteState = {
      ...seedState(TODAY),
      profile: { ...seedState(TODAY).profile, raceDate: addDays(TODAY, 7 * 40) },
    }
    expect(idsOf(s)).not.toContain('race_feasibility')
  })
})

describe('repères manquants', () => {
  it('annonce la part du score en attente de tests', () => {
    const a = find(seedState(TODAY), 'benchmarks_missing')!
    expect(a.title).toContain('% du score')
    expect(a.body).toContain('tractions')
  })

  it('signale aussi un repère connu par un simple plancher', () => {
    const base = seedState(TODAY)
    // les quatre repères du haut du corps sont testés, mais le squat du seed
    // reste un « au moins 50 » : le maximum réel n'a jamais été atteint
    const s: AthleteState = {
      ...base,
      benchmarks: {
        ...base.benchmarks,
        pullups: { value: 12, partial: false, testedAt: TODAY },
        dips: { value: 20, partial: false, testedAt: TODAY },
        muscleups: { value: 2, partial: false, testedAt: TODAY },
        legraises: { value: 8, partial: false, testedAt: TODAY },
      },
    }
    const a = find(s, 'benchmarks_missing')!
    expect(a.body).toContain('Minimum connu')
    expect(a.body).toContain('squats')
    expect(a.evidence).toContain('1 connu(s) par un plancher')
  })

  it('disparait une fois tous les maximums réellement testés', () => {
    const base = seedState(TODAY)
    const tested = (value: number) => ({ value, partial: false, testedAt: TODAY })
    const s: AthleteState = {
      ...base,
      benchmarks: {
        pullups: tested(12),
        dips: tested(20),
        muscleups: tested(2),
        legraises: tested(8),
        squats: tested(60),
      },
    }
    expect(idsOf(s)).not.toContain('benchmarks_missing')
  })
})

describe('tri des signaux', () => {
  it('classe le critique avant l avertissement, puis l information', () => {
    const sessions = Array.from({ length: 9 }, (_, i) => run(addDays(TODAY, -(i + 1)), 5, 30, 5))
    const s: AthleteState = {
      ...emptyState(TODAY),
      sessions,
      wellness: [{ date: TODAY, fatigue: 9, sleep: 7 }],
    }
    const levels = computeAlerts(s, TODAY).map((a) => a.level)
    expect(levels[0]).toBe('critical')
    expect(levels[levels.length - 1]).toBe('info')
  })

  it('se limite à trois signaux sur l accueil', () => {
    const sessions = Array.from({ length: 9 }, (_, i) => run(addDays(TODAY, -(i + 1)), 5, 30, 9))
    const s: AthleteState = {
      ...emptyState(TODAY),
      sessions,
      wellness: [{ date: TODAY, fatigue: 9, sleep: 5, soreness: 'mollets' }],
    }
    expect(computeAlerts(s, TODAY).slice(0, 3)).toHaveLength(3)
  })
})
