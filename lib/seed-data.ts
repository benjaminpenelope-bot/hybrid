import { addDays } from './engine/date'
import { generatePlan } from './engine/program'
import type { AthleteState, ISODate, Session } from './engine/types'

/**
 * HISTORIQUE REEL DE REFERENCE — rien d'inventé.
 * Les champs non communiques restent à null et s'affichent « A TESTER ».
 * Sert au seed de la base et de fixture aux tests du moteur.
 */

export const SEED_PROFILE = {
  name: 'Benjamin',
  heightCm: 191,
  startWeight: 83,
  goalWeight: 88,
  restWeekday: 1,
  allowDoubles: false,
} as const

let counter = 0
const seq = (): string => `seed-${++counter}`

export function seedHistory(today: ISODate, makeId: () => string = seq): Session[] {
  const d = (n: number): ISODate => addDays(today, n)
  return [
    {
      id: makeId(),
      date: d(-5),
      type: 'SWIM',
      kind: 'swim',
      status: 'done',
      week: 0,
      title: 'Piscine',
      cues: [],
      duration: 45,
      intensity: 2,
      exercises: [],
      log: { minutes: 45, distance: null, continuous: 25, pauses: null, stroke: 'Brasse', source: 'manual' },
      rpe: null,
      rpeEst: 4,
    },
    {
      id: makeId(),
      date: d(-4),
      type: 'RUN',
      kind: 'run',
      status: 'done',
      week: 0,
      title: 'Running',
      cues: [],
      duration: 25,
      intensity: 2,
      exercises: [],
      log: { km: 4.43, minutes: 25.4, hr: null, elev: 16, source: 'manual' },
      rpe: null,
      rpeEst: 6,
    },
    {
      id: makeId(),
      date: d(-3),
      type: 'UPPER',
      kind: 'strength',
      status: 'done',
      week: 0,
      title: 'Street — haut du corps',
      cues: [],
      duration: 45,
      intensity: 3,
      exercises: [],
      log: {
        note: 'EMOM pyramide 1→7→1 · environ 49 répétitions au total',
        reps: 49,
        sets: 13,
        minutes: 45,
        source: 'manual',
      },
      rpe: null,
      rpeEst: 7,
    },
    {
      id: makeId(),
      date: d(-2),
      type: 'RUN',
      kind: 'run',
      status: 'done',
      week: 0,
      title: 'Running',
      cues: [],
      duration: 38,
      intensity: 2,
      exercises: [],
      log: { km: 5.75, minutes: 37.57, hr: 156, elev: 18, source: 'manual' },
      rpe: null,
      rpeEst: 5,
    },
    {
      id: makeId(),
      date: d(-1),
      type: 'SWIM',
      kind: 'swim',
      status: 'done',
      week: 0,
      title: 'Piscine',
      cues: [],
      duration: 45,
      intensity: 2,
      exercises: [],
      log: { minutes: 45, distance: null, continuous: 25, pauses: null, stroke: 'Brasse', source: 'manual' },
      rpe: null,
      rpeEst: 4,
    },
  ]
}

/**
 * État complet de depart : historique réel, plan généré sur 8 semaines,
 * une seule pesée, et un seul repère de force — partiel, jamais testé au max.
 */
export function seedState(today: ISODate, makeId: () => string = seq): AthleteState {
  counter = 0
  return {
    profile: {
      ...SEED_PROFILE,
      birthDate: null,
      programStart: today,
      raceDate: null,
    },
    sessions: [
      ...seedHistory(today, makeId),
      ...generatePlan(today, 8, 1, {
        restWeekday: SEED_PROFILE.restWeekday,
        allowDoubles: SEED_PROFILE.allowDoubles,
        makeId,
      }),
    ],
    weights: [{ date: today, kg: 83, source: 'manual' }],
    measures: [],
    photos: [],
    wellness: [],
    benchmarks: {
      pullups: null,
      dips: null,
      muscleups: null,
      legraises: null,
      squats: {
        value: 50,
        partial: true,
        note: '5 × 10 facile — maximum réel inconnu',
        testedAt: today,
      },
    },
    records: [],
  }
}

/** État vide : première ouverture, aucune donnée. Utilise par les tests limites. */
export function emptyState(today: ISODate): AthleteState {
  return {
    profile: {
      name: 'Athlete',
      birthDate: null,
      heightCm: null,
      startWeight: 80,
      goalWeight: 80,
      programStart: today,
      raceDate: null,
      restWeekday: 1,
      allowDoubles: false,
    },
    sessions: [],
    weights: [],
    measures: [],
    photos: [],
    wellness: [],
    benchmarks: {},
    records: [],
  }
}
