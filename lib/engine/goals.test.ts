import { describe, expect, it } from 'vitest'
import { emptyState } from '../seed-data'
import { addDays } from './date'
import { computeGoals, limitationsActives, objectifsActifs } from './goals'
import type { AthleteState, DeclaredGoal, GoalType, Session } from './types'

const TODAY = '2026-03-16'

function objectif(type: GoalType, over: Partial<DeclaredGoal> = {}): DeclaredGoal {
  return {
    id: `g-${type}`,
    type,
    priority: 'principal',
    status: 'actif',
    targetDate: null,
    targetValue: null,
    targetUnit: null,
    note: null,
    ...over,
  }
}

function course(date: string, km: number, minutes: number): Session {
  return {
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
    rpe: null,
    rpeEst: null,
  }
}

function etat(goals: DeclaredGoal[], sessions: Session[] = []): AthleteState {
  return { ...emptyState(TODAY), goals, sessions }
}

const labels = (s: AthleteState) => computeGoals(s, TODAY).map((g) => g.label)

describe('objectifs dérivés du déclaré', () => {
  it("n'invente aucun objectif quand rien n'a été déclaré", () => {
    // C'est le defaut corrige : l'ancien moteur affichait « Marathon sous 4 h »
    // a un compte qui n'avait jamais parle de marathon.
    const l = labels(etat([]))
    expect(l.some((x) => /marathon/i.test(x))).toBe(false)
    expect(l.some((x) => /traction/i.test(x))).toBe(false)
  })

  it('garde les jalons universels même sans objectif déclaré', () => {
    // Ils viennent du profil et du plan, pas d'une intention supposee.
    expect(labels(etat([]))).toContain('Séances réalisées')
  })

  it('affiche le marathon à qui a déclaré un marathon', () => {
    expect(labels(etat([objectif('marathon')]))).toContain('Marathon — 42,2 km')
  })

  it('affiche des jalons HYROX, et aucun jalon de marathon', () => {
    const l = labels(etat([objectif('hyrox')]))
    expect(l).toContain('Courir 8 km d’une traite')
    expect(l.some((x) => /42,2/.test(x))).toBe(false)
  })

  it('ignore un objectif atteint ou abandonné', () => {
    const l = labels(etat([objectif('marathon', { status: 'atteint' })]))
    expect(l.some((x) => /42,2/.test(x))).toBe(false)
  })

  it('cumule principal et secondaire sans doublon', () => {
    // « Sortie longue de 25 km » appartient au marathon comme a l'endurance.
    const s = etat([
      objectif('marathon'),
      objectif('endurance', { id: 'g2', priority: 'secondaire' }),
    ])
    const l = labels(s)
    expect(l.filter((x) => x === 'Sortie longue de 25 km')).toHaveLength(1)
    expect(l).toContain('1 500 m nagés sans pause')
  })
})

describe('mesure sur les données réelles', () => {
  it('calcule la progression à partir des séances enregistrées', () => {
    const s = etat([objectif('marathon')], [course(addDays(TODAY, -2), 21.1, 130)])
    const marathon = computeGoals(s, TODAY).find((g) => g.label === 'Marathon — 42,2 km')
    expect(marathon?.progress).toBe(50)
  })

  it('laisse la progression à null quand rien n’a été mesuré', () => {
    const marathon = computeGoals(etat([objectif('marathon')]), TODAY).find(
      (g) => g.label === 'Marathon — 42,2 km',
    )
    expect(marathon?.progress).toBeNull()
    expect(marathon?.current).toContain('aucune sortie')
  })

  it('affiche « À TESTER » sur un repère jamais mesuré, sans le compter à zéro', () => {
    const tractions = computeGoals(etat([objectif('force')]), TODAY).find(
      (g) => g.label === '15 tractions strictes',
    )
    expect(tractions?.current).toBe('À TESTER')
    expect(tractions?.progress).toBeNull()
  })

  it('signale ce que l’app ne sait pas mesurer plutôt que de le taire', () => {
    // Les ateliers HYROX demandent du materiel qu'aucun ecran n'enregistre.
    // Les masquer laisserait croire que l'objectif est couvert en entier.
    const ateliers = computeGoals(etat([objectif('hyrox')]), TODAY).find((g) =>
      /Ateliers HYROX/.test(g.label),
    )
    expect(ateliers).toBeDefined()
    expect(ateliers?.progress).toBeNull()
  })
})

describe('formatage', () => {
  it('ecrit les nombres a la francaise, cible et mesure comprises', () => {
    // Une meme ligne affichait « 10.2 km · objectif 42,2 km ».
    const s = etat([objectif('marathon')], [course(addDays(TODAY, -2), 10.2, 60)])
    const g = computeGoals(s, TODAY).find((x) => x.label === 'Marathon — 42,2 km')
    expect(g?.current).toBe('10,2 km')
    expect(g?.target).toBe('42,2 km')
  })

  it('groupe les milliers', () => {
    const g = computeGoals(etat([objectif('endurance')]), TODAY).find(
      (x) => x.label === '1 500 m nagés sans pause',
    )
    expect(g?.target).toBe('1\u202f500 m')
  })
})

describe('sélection', () => {
  it('place le principal avant le secondaire', () => {
    const s = etat([
      objectif('endurance', { id: 'g2', priority: 'secondaire' }),
      objectif('marathon'),
    ])
    expect(objectifsActifs(s)[0]?.priority).toBe('principal')
  })

  it('ne retient que les limitations en cours à la date du jour', () => {
    const s: AthleteState = {
      ...emptyState(TODAY),
      limitations: [
        { id: 'a', zone: 'épaule', description: null, startedOn: addDays(TODAY, -10), endedOn: null },
        { id: 'b', zone: 'genou', description: null, startedOn: addDays(TODAY, -60), endedOn: addDays(TODAY, -30) },
      ],
    }
    expect(limitationsActives(s, TODAY).map((l) => l.zone)).toEqual(['épaule'])
  })
})
