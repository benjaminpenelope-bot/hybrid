import { describe, expect, it } from 'vitest'
import { debutDuMois, evaluer, LIMITES, MODELES, messageQuota } from './quota'

describe('plafonds', () => {
  it('laisse passer tant que les deux plafonds tiennent', () => {
    const e = evaluer('free', 0, 0)
    expect(e.autorise).toBe(true)
    expect(e.restantJour).toBe(LIMITES.free.jour)
    expect(e.restantMois).toBe(LIMITES.free.mois)
  })

  it('bloque sur le plafond journalier', () => {
    const e = evaluer('free', LIMITES.free.jour, 0)
    expect(e.autorise).toBe(false)
    expect(e.motif).toBe('jour')
  })

  it('bloque sur le plafond mensuel même si la journée est libre', () => {
    const e = evaluer('free', 0, LIMITES.free.mois)
    expect(e.autorise).toBe(false)
    expect(e.motif).toBe('mois')
  })

  it('annonce le mois en priorité quand les deux sont atteints', () => {
    // Le mois est la vraie mauvaise nouvelle : dire « reviens demain » serait
    // faux, puisque demain sera bloqué aussi.
    const e = evaluer('free', LIMITES.free.jour, LIMITES.free.mois)
    expect(e.motif).toBe('mois')
    expect(messageQuota(e).texte).toContain('mois')
  })

  it('ne rend jamais un restant négatif', () => {
    // Un compteur peut depasser le plafond si celui-ci est abaisse en cours
    // de mois : « il te reste -4 messages » n'a aucun sens.
    const e = evaluer('free', 99, 99)
    expect(e.restantJour).toBe(0)
    expect(e.restantMois).toBe(0)
  })

  it('donne plus de marge au plan payant qu’au gratuit', () => {
    expect(LIMITES.pro.mois).toBeGreaterThan(LIMITES.free.mois)
    expect(LIMITES.pro.jour).toBeGreaterThan(LIMITES.free.jour)
  })
})

describe('proposition d’abonnement', () => {
  it('propose PRO quand un compte gratuit bute sur son plafond', () => {
    const m = messageQuota(evaluer('free', LIMITES.free.jour, 0))
    expect(m.offre).not.toBeNull()
    expect(m.offre).toContain(String(LIMITES.pro.jour))
  })

  it('ne propose rien à un abonné qui bute sur le sien', () => {
    // Lui vendre ce qu'il paie deja serait insultant, et il n'y a pas
    // d'offre au-dessus.
    expect(messageQuota(evaluer('pro', LIMITES.pro.jour, 0)).offre).toBeNull()
  })
})

describe('modèle par plan', () => {
  it('réserve le modèle le plus cher au plan payant', () => {
    // Le cout suit le revenu au lieu de le preceder.
    expect(MODELES.free.modele).toBe('claude-sonnet-5')
    expect(MODELES.pro.modele).toBe('claude-opus-5')
  })

  it('n’active le repli serveur que là où il est documenté', () => {
    expect(MODELES.free.repliServeur).toBe(false)
    expect(MODELES.pro.repliServeur).toBe(true)
  })
})

describe('fenêtre mensuelle', () => {
  it('ramène au premier du mois', () => {
    expect(debutDuMois('2026-08-29')).toBe('2026-08-01')
    expect(debutDuMois('2026-01-01')).toBe('2026-01-01')
  })
})
