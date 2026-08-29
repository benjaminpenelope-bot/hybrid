import { describe, expect, it } from 'vitest'
import { statutDepuisStripe } from './stripe'

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
