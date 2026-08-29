import { describe, expect, it } from 'vitest'
import { messageStripe, statutDepuisStripe } from './stripe'

describe('traduction des statuts Stripe', () => {
  it('donne accès pendant un abonnement actif ou en essai Stripe', () => {
    expect(statutDepuisStripe('active')).toBe('actif')
    expect(statutDepuisStripe('trialing')).toBe('actif')
  })

  it('ne coupe pas à la première échéance impayée', () => {
    // Stripe reessaie le prelevement pendant plusieurs jours. Couper tout de
    // suite priverait d'acces quelqu'un dont la carte a expire un mardi.
    // `periode_fin` fait le reste.
    expect(statutDepuisStripe('past_due')).toBe('annule')
    expect(statutDepuisStripe('unpaid')).toBe('annule')
  })

  it('ferme sur un abonnement terminé', () => {
    // `canceled` chez Stripe veut dire « termine », pas « resiliation
    // programmee » : une resiliation a venir reste `active` jusqu'au bout.
    expect(statutDepuisStripe('canceled')).toBe('expire')
    expect(statutDepuisStripe('incomplete_expired')).toBe('expire')
  })
})

describe('traduction des erreurs', () => {
  it('ne fait pas passer une erreur de configuration pour une panne', () => {
    // « momentanement indisponible » invite a reessayer plus tard, alors
    // qu'un tarif absent ou une cle du mauvais monde ne se reparent jamais
    // seuls. C'est ce qui a fait chercher au mauvais endroit.
    const config = messageStripe({ type: 'StripeInvalidRequestError' })
    expect(config).not.toContain('momentané')
    expect(messageStripe({ type: 'StripeAuthenticationError' })).toContain('configuré')
  })

  it('invite à réessayer sur une vraie panne passagère', () => {
    expect(messageStripe({ type: 'StripeConnectionError' })).toContain('Réessaie')
  })

  it('reste prudent sur une erreur inconnue', () => {
    expect(messageStripe(new Error('bruit'))).toContain('Réessaie')
    expect(messageStripe(null)).toContain('Réessaie')
  })
})
