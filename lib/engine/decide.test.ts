import { describe, expect, it } from 'vitest'
import { emptyState } from '../seed-data'
import { addDays } from './date'
import { decide } from './decide'
import type { AthleteState, Session, Wellness } from './types'

const TODAY = '2026-03-16'

function seance(date: string, over: Partial<Session> = {}): Session {
  return {
    id: `s-${date}-${over.type ?? 'RUN'}`,
    date,
    type: 'RUN',
    kind: 'run',
    status: 'planned',
    week: 1,
    title: 'Footing',
    cues: [],
    duration: 45,
    intensity: 2,
    exercises: [],
    log: null,
    rpe: null,
    rpeEst: null,
    ...over,
  }
}

/** Séance validée, qui pèse donc dans la charge. */
function faite(date: string, minutes: number, rpe: number, over: Partial<Session> = {}): Session {
  return seance(date, { status: 'done', duration: minutes, rpe, log: { minutes, km: 8 }, ...over })
}

function forme(date: string, over: Partial<Wellness> = {}): Wellness {
  return { date, sleep: 8, fatigue: 2, motivation: 8, soreness: null, restingHr: null, ...over }
}

function etat(sessions: Session[], wellness: Wellness[] = []): AthleteState {
  return { ...emptyState(TODAY), sessions, wellness }
}

/** Charge stable sur quatre semaines : rend le ratio aigu/chronique fiable. */
function historique(jours: number, minutes: number, rpe: number): Session[] {
  return Array.from({ length: jours }, (_, i) =>
    faite(addDays(TODAY, -(i + 1)), minutes, rpe, { id: `h${i}` }),
  )
}

describe('douleur déclarée', () => {
  it("allège fortement et cite la douleur telle qu'elle a été écrite", () => {
    const s = etat([
      faite(addDays(TODAY, -1), 45, 6, { pain: 'tendon d’Achille gauche' }),
      seance(TODAY),
    ])
    const v = decide(s, TODAY)
    expect(v.action).toBe('alleger')
    expect(v.ampleur).toBe(0.7)
    expect(v.preuves[0]?.valeur).toBe('tendon d’Achille gauche')
  })

  it('passe avant toute autre règle, même une récupération excellente', () => {
    const s = etat(
      [faite(addDays(TODAY, -1), 45, 3, { pain: 'genou droit' }), seance(TODAY)],
      [forme(TODAY, { sleep: 9, fatigue: 1 })],
    )
    expect(decide(s, TODAY).action).toBe('alleger')
  })

  it('cesse de peser au-delà de la fenêtre', () => {
    const s = etat([
      faite(addDays(TODAY, -5), 45, 6, { pain: 'mollet' }),
      seance(TODAY),
    ])
    expect(decide(s, TODAY).action).not.toBe('alleger')
  })
})

describe('jour sans séance', () => {
  it('ne propose jamais d’ajouter une séance un jour de repos', () => {
    // Le repos fait partie du plan, pas des trous a combler.
    const s = etat([seance(TODAY, { type: 'REST', kind: 'rest', title: 'Repos', duration: 0 })])
    const v = decide(s, TODAY)
    expect(v.action).toBe('maintenir')
    expect(v.sessionId).toBeNull()
  })
})

describe('enchaînement trop long', () => {
  it('propose un report quand le lendemain est libre', () => {
    const s = etat([...historique(7, 45, 6), seance(TODAY)])
    const v = decide(s, TODAY)
    expect(v.action).toBe('deplacer')
    expect(v.versDate).toBe(addDays(TODAY, 1))
    // Deplacer change la structure de la semaine : la latitude equilibree
    // impose de demander avant d'appliquer.
    expect(v.confirmationRequise).toBe(true)
  })

  it('bascule en repos quand le lendemain est déjà pris', () => {
    const s = etat([...historique(7, 45, 6), seance(TODAY), seance(addDays(TODAY, 1), { id: 'demain' })])
    const v = decide(s, TODAY)
    expect(v.action).toBe('repos')
    expect(v.confirmationRequise).toBe(true)
  })
})

describe('récupération', () => {
  it('impose le repos quand elle est mesurée et au rouge', () => {
    const s = etat(
      [faite(addDays(TODAY, -1), 45, 9), seance(TODAY)],
      [forme(TODAY, { sleep: 3, fatigue: 10, motivation: 1 })],
    )
    const v = decide(s, TODAY)
    expect(v.action).toBe('repos')
    expect(v.confirmationRequise).toBe(true)
  })

  it('allège au jaune, sans demander confirmation', () => {
    const s = etat(
      [faite(addDays(TODAY, -1), 45, 6), seance(TODAY)],
      [forme(TODAY, { sleep: 6, fatigue: 6, motivation: 5 })],
    )
    const v = decide(s, TODAY)
    expect(v.action).toBe('alleger')
    expect(v.ampleur).toBe(0.85)
    expect(v.confirmationRequise).toBe(false)
  })

  it("ne conclut rien d'une récupération non mesurée", () => {
    // C'est la regle centrale du produit : un score neutre fabrique a partir
    // de rien ne justifie aucune decision.
    const s = etat([seance(TODAY)])
    const v = decide(s, TODAY)
    expect(v.action).toBe('maintenir')
    expect(v.preuves.some((p) => p.quoi === 'Récupération')).toBe(true)
  })
})

describe('progression', () => {
  it('exige récupération mesurée ET charge réellement basse', () => {
    // Quatre semaines de charge soutenue, puis une semaine tres legere :
    // le ratio descend sous 0,8 et la recuperation est verte.
    const fond = Array.from({ length: 21 }, (_, i) =>
      faite(addDays(TODAY, -(i + 8)), 60, 7, { id: `f${i}` }),
    )
    const s = etat([...fond, seance(TODAY)], [forme(TODAY, { sleep: 9, fatigue: 1, motivation: 9 })])
    const v = decide(s, TODAY)
    expect(v.action).toBe('progresser')
    expect(v.ampleur).toBe(1.05)
    // Les deux preuves doivent etre citees, pas une seule.
    expect(v.preuves).toHaveLength(2)
  })

  it('ne progresse pas sur une charge basse si la récupération n’est pas mesurée', () => {
    // Une charge basse peut venir d'une semaine de maladie : sans ressenti,
    // on ne l'interprete pas comme de la fraicheur.
    const fond = Array.from({ length: 21 }, (_, i) =>
      faite(addDays(TODAY, -(i + 8)), 60, 7, { id: `f${i}` }),
    )
    const s = etat([...fond, seance(TODAY)])
    expect(decide(s, TODAY).action).toBe('maintenir')
  })
})

describe('forme du verdict', () => {
  it('porte toujours au moins une preuve', () => {
    const s = etat([seance(TODAY)])
    expect(decide(s, TODAY).preuves.length).toBeGreaterThan(0)
  })

  it('ne rend jamais une action hors de la latitude équilibrée', () => {
    // `supprimer` et `remplacer` relevent d'une latitude etendue, non retenue.
    const autorisees = ['maintenir', 'progresser', 'alleger', 'deplacer', 'repos']
    const cas: AthleteState[] = [
      etat([seance(TODAY)]),
      etat([...historique(7, 45, 6), seance(TODAY)]),
      etat([faite(addDays(TODAY, -1), 45, 6, { pain: 'dos' }), seance(TODAY)]),
      etat([seance(TODAY)], [forme(TODAY, { sleep: 3, fatigue: 10 })]),
      etat([]),
    ]
    for (const c of cas) expect(autorisees).toContain(decide(c, TODAY).action)
  })

  it('vise la séance du jour quand il y en a une', () => {
    const s = etat([seance(TODAY, { id: 'cible' })])
    expect(decide(s, TODAY).sessionId).toBe('cible')
  })

  it('est déterministe : deux appels rendent le même verdict', () => {
    const s = etat([...historique(7, 45, 6), seance(TODAY)])
    expect(decide(s, TODAY)).toEqual(decide(s, TODAY))
  })
})

describe('fraîcheur du ressenti', () => {
  it('ignore un relevé de la veille pour décider du jour', () => {
    // computeRecovery se contente du dernier releve connu, sans limite d age.
    // Dire « tu recuperes bien aujourd hui » a partir d hier presenterait une
    // absence de mesure comme une mesure.
    const s = etat(
      [faite(addDays(TODAY, -1), 45, 6), seance(TODAY)],
      [forme(addDays(TODAY, -1), { sleep: 3, fatigue: 10, motivation: 1 })],
    )
    const v = decide(s, TODAY)
    expect(v.action).toBe('maintenir')
    expect(v.preuves.some((p) => p.quoi === 'Récupération')).toBe(true)
  })

  it('tient compte du relevé quand il est du jour', () => {
    const s = etat(
      [faite(addDays(TODAY, -1), 45, 6), seance(TODAY)],
      [forme(TODAY, { sleep: 3, fatigue: 10, motivation: 1 })],
    )
    expect(decide(s, TODAY).action).toBe('repos')
  })

  it('laisse les règles de charge fonctionner sans aucun ressenti', () => {
    // La charge se calcule depuis l historique : elle est toujours a jour,
    // meme quand l athlete n a rien declare.
    const s = etat([...historique(7, 45, 6), seance(TODAY)])
    expect(decide(s, TODAY).action).toBe('deplacer')
  })
})
