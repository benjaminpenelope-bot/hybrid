import { describe, expect, it } from 'vitest'
import { jourDansFuseau, jourLocal, msAvantMinuit } from './fuseau'

/** 10 septembre 2026, 00 h 30 à Paris — soit 22 h 30 le 9 en UTC. */
const NUIT_PARIS = new Date('2026-09-09T22:30:00Z')
/** 10 septembre 2026, 23 h 30 à Paris — soit 21 h 30 le 10 en UTC. */
const SOIR_PARIS = new Date('2026-09-10T21:30:00Z')

describe('le jour de l’athlète', () => {
  it('rend la date de son fuseau, pas celle du serveur', () => {
    // C'est le defaut qu'on corrige : le serveur, en UTC, annoncait encore
    // le 9 alors qu'il etait minuit passe a Paris.
    expect(jourDansFuseau('Europe/Paris', NUIT_PARIS)).toBe('2026-09-10')
    expect(jourDansFuseau('UTC', NUIT_PARIS)).toBe('2026-09-09')
  })

  it('ne part pas en avance le soir', () => {
    // Le defaut symetrique : a 23 h 30 a Paris, UTC est encore le meme jour
    // ici, mais l'hiver il serait deja au lendemain.
    expect(jourDansFuseau('Europe/Paris', SOIR_PARIS)).toBe('2026-09-10')
  })

  it('suit un athlète qui change de continent', () => {
    expect(jourDansFuseau('Pacific/Auckland', NUIT_PARIS)).toBe('2026-09-10')
    expect(jourDansFuseau('America/Los_Angeles', NUIT_PARIS)).toBe('2026-09-09')
  })

  it('retombe sur l’horloge de la machine sans fuseau', () => {
    expect(jourDansFuseau(undefined, NUIT_PARIS)).toBe(jourLocal(NUIT_PARIS))
  })

  it('retombe sur l’horloge de la machine sur un fuseau inconnu', () => {
    // Un temoin bricole ne doit pas faire echouer un ecran entier.
    expect(jourDansFuseau('Mars/Olympus', NUIT_PARIS)).toBe(jourLocal(NUIT_PARIS))
  })
})

describe('prochain minuit', () => {
  const heures = (ms: number) => Math.round((ms / 3600000) * 10) / 10

  it('tombe bien à minuit, pas à celui du serveur', () => {
    // 00 h 30 a Paris : il reste vingt-trois heures et demie.
    expect(heures(msAvantMinuit('Europe/Paris', NUIT_PARIS))).toBe(23.5)
    // En UTC au meme instant, il n'en reste qu'une heure et demie.
    expect(heures(msAvantMinuit('UTC', NUIT_PARIS))).toBe(1.5)
  })

  it('rend une demi-heure quand il est 23 h 30', () => {
    expect(heures(msAvantMinuit('Europe/Paris', SOIR_PARIS))).toBe(0.5)
  })

  it('tient le passage à l’heure d’hiver', () => {
    // La nuit du 25 octobre 2026 en France : deux heures du matin sonnent
    // deux fois, et la journee du 25 compte vingt-cinq heures. Un calcul
    // arithmetique sur les heures tomberait a cote.
    const veille = new Date('2026-10-24T21:00:00Z') // 23 h le 24 a Paris
    const cible = new Date(veille.getTime() + msAvantMinuit('Europe/Paris', veille))
    expect(jourDansFuseau('Europe/Paris', cible)).toBe('2026-10-25')
    expect(heures(msAvantMinuit('Europe/Paris', veille))).toBe(1)
  })

  it('reste toujours dans la journée à venir', () => {
    for (const fuseau of ['Europe/Paris', 'UTC', 'Pacific/Kiritimati', 'America/Anchorage']) {
      const ms = msAvantMinuit(fuseau, NUIT_PARIS)
      expect(ms).toBeGreaterThan(0)
      expect(ms).toBeLessThanOrEqual(26 * 3600 * 1000)
      // Juste avant, on est encore aujourd'hui ; juste apres, demain.
      const avant = new Date(NUIT_PARIS.getTime() + ms - 2000)
      const apres = new Date(NUIT_PARIS.getTime() + ms + 2000)
      expect(jourDansFuseau(fuseau, avant)).toBe(jourDansFuseau(fuseau, NUIT_PARIS))
      expect(jourDansFuseau(fuseau, apres)).not.toBe(jourDansFuseau(fuseau, NUIT_PARIS))
    }
  })
})
