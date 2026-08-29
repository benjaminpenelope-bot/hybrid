import { describe, expect, it } from 'vitest'
import { estPro, joursRestants, type Abonnement } from './abonnement'

const MAINTENANT = new Date('2026-08-29T12:00:00Z')

function abo(over: Partial<Abonnement> = {}): Abonnement {
  return {
    statut: 'actif',
    source: 'stripe',
    periodeFin: '2026-09-29T12:00:00Z',
    essaiUtilise: false,
    ...over,
  }
}

describe('accès PRO', () => {
  it('refuse quand aucun abonnement n’existe', () => {
    expect(estPro(null, MAINTENANT)).toBe(false)
  })

  it('accorde pendant un essai en cours', () => {
    expect(estPro(abo({ statut: 'essai' }), MAINTENANT)).toBe(true)
  })

  it('retombe au gratuit dès que l’échéance est passée, sans rien exécuter', () => {
    // C'est le coeur du dispositif : la bascule se deduit de la date. Aucune
    // tache planifiee ne peut l'oublier, et un abonnement expire ne peut pas
    // continuer a donner acces parce qu'un cron est tombe.
    expect(estPro(abo({ periodeFin: '2026-08-28T12:00:00Z' }), MAINTENANT)).toBe(false)
    expect(estPro(abo({ statut: 'essai', periodeFin: '2026-08-28T12:00:00Z' }), MAINTENANT)).toBe(false)
  })

  it('laisse un abonnement résilié courir jusqu’au terme déjà payé', () => {
    // Couper a l'instant de la resiliation reviendrait a facturer un service
    // qu'on retire.
    expect(estPro(abo({ statut: 'annule' }), MAINTENANT)).toBe(true)
  })

  it('refuse un abonnement marqué expiré même si la date traîne', () => {
    expect(estPro(abo({ statut: 'expire' }), MAINTENANT)).toBe(false)
  })
})

describe('jours restants', () => {
  it('compte les jours jusqu’à l’échéance', () => {
    expect(joursRestants(abo({ periodeFin: '2026-09-05T12:00:00Z' }), MAINTENANT)).toBe(7)
  })

  it('devient négatif une fois l’échéance passée', () => {
    expect(joursRestants(abo({ periodeFin: '2026-08-27T12:00:00Z' }), MAINTENANT)).toBeLessThan(0)
  })
})
