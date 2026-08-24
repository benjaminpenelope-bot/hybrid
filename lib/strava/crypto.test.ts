import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { CleManquante, chiffrementDisponible, chiffrer, dechiffrer } from './crypto'

const CLE = Buffer.alloc(32, 7).toString('base64')

describe('chiffrement des tokens', () => {
  beforeEach(() => {
    process.env.TOKEN_ENCRYPTION_KEY = CLE
  })

  afterEach(() => {
    delete process.env.TOKEN_ENCRYPTION_KEY
  })

  it('rend le clair après un aller-retour', () => {
    const token = 'a1b2c3d4e5f6'
    expect(dechiffrer(chiffrer(token))).toBe(token)
  })

  it('ne laisse jamais le clair apparaître dans le chiffré', () => {
    expect(chiffrer('token-tres-secret')).not.toContain('token-tres-secret')
  })

  it('produit deux chiffrés différents pour le même clair', () => {
    // Sans IV neuf, deux comptes au même token seraient reconnaissables en base.
    expect(chiffrer('meme-token')).not.toBe(chiffrer('meme-token'))
  })

  it('refuse un chiffré modifié plutôt que de rendre n importe quoi', () => {
    const paquet = chiffrer('token')
    const parts = paquet.split('.')
    const altere = Buffer.from(parts[2]!, 'base64url')
    altere[0] = altere[0]! ^ 0xff
    parts[2] = altere.toString('base64url')
    expect(() => dechiffrer(parts.join('.'))).toThrow()
  })

  it('refuse un chiffré tronqué', () => {
    expect(() => dechiffrer('nimportequoi')).toThrow('Token chiffré illisible.')
  })

  it('refuse de déchiffrer avec une autre clé', () => {
    const paquet = chiffrer('token')
    process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString('base64')
    expect(() => dechiffrer(paquet)).toThrow()
  })

  it('signale une clé absente au lieu de chiffrer avec du vide', () => {
    delete process.env.TOKEN_ENCRYPTION_KEY
    expect(chiffrementDisponible()).toBe(false)
    expect(() => chiffrer('token')).toThrow(CleManquante)
  })

  it('signale une clé de mauvaise taille', () => {
    process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(16, 1).toString('base64')
    expect(chiffrementDisponible()).toBe(false)
    expect(() => chiffrer('token')).toThrow(CleManquante)
  })
})
