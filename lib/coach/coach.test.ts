import { describe, expect, it } from 'vitest'
import { emptyState, seedState } from '../seed-data'
import { addDays } from '../engine/date'
import { buildCoachContext, quickPrompts } from './context'
import { localAnswer, openingMessage } from './local'
import { validateProposal, COACH_TOOLS } from './tools'
import type { AthleteState } from '../engine/types'

const TODAY = '2026-03-16'

describe('buildCoachContext', () => {
  const context = buildCoachContext(seedState(TODAY), TODAY)

  it('marque les repères non testés au lieu de les mettre à zéro', () => {
    expect(context.reperes_force.tractions).toBe('A TESTER')
    // le squat du seed est un plancher déclaré
    expect(context.reperes_force.squats).toContain('au moins 50')
    expect(context.reperes_force.squats).toContain('maximum non testé')
  })

  it('annonce la part du score non mesurée', () => {
    expect(context.part_du_score_non_mesuree).toMatch(/^\d+ %$/)
  })

  it('dit que la récupération n est pas mesurée plutôt que d envoyer 65', () => {
    const context = buildCoachContext(emptyState(TODAY), TODAY)
    expect(context.recuperation.score).toBe('non mesurée')
  })

  it('signale si le ratio de charge est fiable', () => {
    // cinq jours d'historique : le ratio ne veut rien dire
    expect(context.recuperation.ratio_fiable).toBe(false)
  })

  it('limite la fenêtre à 8 séances passées et 4 à venir', () => {
    expect(context.seances_recentes.length).toBeLessThanOrEqual(8)
    expect(context.seances_a_venir.length).toBeLessThanOrEqual(4)
  })

  it('transmet les identifiants des séances à venir, pour les outils', () => {
    for (const s of context.seances_a_venir) {
      expect(typeof s.id).toBe('string')
    }
  })

  it('n invente aucune allure quand aucune sortie n est mesurée', () => {
    const context = buildCoachContext(emptyState(TODAY), TODAY)
    expect(context.course.meilleure_allure_min_par_km).toBe('A TESTER')
    expect(context.course.plus_longue_sortie_km).toBe('A TESTER')
  })
})

describe('ce que le coach sait de la declaration', () => {
  it("porte l'objectif declare, pas un objectif suppose", () => {
    const context = buildCoachContext(seedState(TODAY), TODAY)
    expect(context.objectifs).toHaveLength(1)
    expect(context.objectifs[0]?.objectif).toBe('Hybride')
  })

  it("n'invente aucun objectif quand rien n'a ete declare", () => {
    expect(buildCoachContext(emptyState(TODAY), TODAY).objectifs).toEqual([])
  })

  it('ne transmet que les limitations en cours', () => {
    const etat: AthleteState = {
      ...emptyState(TODAY),
      limitations: [
        { id: 'a', zone: 'épaule', description: null, startedOn: addDays(TODAY, -5), endedOn: null },
        { id: 'b', zone: 'genou', description: null, startedOn: addDays(TODAY, -90), endedOn: addDays(TODAY, -60) },
      ],
    }
    expect(buildCoachContext(etat, TODAY).limitations.map((l) => l.zone)).toEqual(['épaule'])
  })

  it('porte le verdict du jour et ses preuves', () => {
    // Sans lui, le coach raisonnait a cote de l'ecran d'accueil et pouvait
    // le contredire sur la meme journee.
    const v = buildCoachContext(seedState(TODAY), TODAY).verdict_du_jour
    expect(v.action).toBeDefined()
    expect(Array.isArray(v.preuves)).toBe(true)
  })
})

describe('quickPrompts', () => {
  it('propose de tester les repères quand ils manquent', () => {
    const prompts = quickPrompts(seedState(TODAY), TODAY)
    expect(prompts.some((p) => p.includes('tractions'))).toBe(true)
  })

  it('remonte la douleur en premier', () => {
    const base = seedState(TODAY)
    const state: AthleteState = {
      ...base,
      wellness: [{ date: addDays(TODAY, -1), fatigue: 6, soreness: 'genou' }],
    }
    expect(quickPrompts(state, TODAY)[0]).toContain('mal')
  })

  it('ne dépasse jamais quatre suggestions', () => {
    expect(quickPrompts(seedState(TODAY), TODAY).length).toBeLessThanOrEqual(4)
  })
})

describe('localAnswer', () => {
  it('refuse de commenter la récupération sans relevé', () => {
    const answer = localAnswer('je suis fatigué', emptyState(TODAY), TODAY)
    expect(answer).toContain("n'as pas encore renseigné")
    expect(answer).not.toMatch(/score de récupération est à \d+/)
  })

  it('cite le score réel quand il est mesuré', () => {
    const base = seedState(TODAY)
    const state: AthleteState = {
      ...base,
      wellness: [{ date: TODAY, sleep: 8, fatigue: 3 }],
    }
    expect(localAnswer('je suis crevé', state, TODAY)).toMatch(/score de récupération est à \d+/)
  })

  it('ne pose aucun diagnostic sur une douleur', () => {
    const answer = localAnswer("j'ai mal au genou", seedState(TODAY), TODAY)
    expect(answer).toContain('professionnel de santé')
    expect(answer).toContain('aucun diagnostic')
  })

  it('dit que la natation n est pas mesurée plutôt que d annoncer 0 m', () => {
    const answer = localAnswer('parle-moi de la piscine', emptyState(TODAY), TODAY)
    expect(answer).toContain("n'a jamais été mesurée")
  })

  it('cite les kilomètres réels sur une question de course', () => {
    expect(localAnswer("j'ai couru hier", seedState(TODAY), TODAY)).toContain('10.2 km')
  })
})

describe('openingMessage', () => {
  it('ouvre sur le signal le plus critique du jour', () => {
    const base = seedState(TODAY)
    const state: AthleteState = {
      ...base,
      wellness: [{ date: TODAY, fatigue: 5, soreness: 'tendon d’Achille' }],
    }
    expect(openingMessage(state, TODAY)).toContain('Douleur signalée')
  })

  it('ouvre sur la séance du jour quand rien ne cloche', () => {
    // le seed n'a que des signaux de niveau information
    expect(openingMessage(seedState(TODAY), TODAY)).toContain('Salut Benjamin')
  })
})

describe('outils du coach', () => {
  it('expose les quatre actions prévues', () => {
    expect(COACH_TOOLS.map((t) => t.name).sort()).toEqual([
      'adjust_session',
      'log_session',
      'postpone_session',
      'set_benchmark',
    ])
  })

  it('décrit quand appeler chaque outil, pas seulement ce qu il fait', () => {
    for (const tool of COACH_TOOLS) {
      expect(tool.description).toMatch(/quand|dès que/i)
    }
  })

  it('rejette une proposition mal formée', () => {
    expect(validateProposal('set_benchmark', { key: 'inconnu', value: 10 })).toBeNull()
    expect(validateProposal('adjust_session', { session_id: 'pas-un-uuid' })).toBeNull()
    expect(validateProposal('outil_inexistant', {})).toBeNull()
  })

  it('accepte une proposition valide', () => {
    const valid = validateProposal('set_benchmark', {
      key: 'pullups',
      value: 12,
      partiel: false,
    })
    expect(valid).toEqual({ key: 'pullups', value: 12, partiel: false })
  })

  it('exige durée et RPE pour enregistrer une séance', () => {
    expect(validateProposal('log_session', { date: TODAY, type: 'RUN', km: 8 })).toBeNull()
    expect(
      validateProposal('log_session', { date: TODAY, type: 'RUN', km: 8, minutes: 48, rpe: 6 }),
    ).not.toBeNull()
  })
})
