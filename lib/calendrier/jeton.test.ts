import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { calendrierOuvert, compteDuJeton, jetonDe } from './jeton'

const SECRET = 'un-secret-assez-long-pour-servir'
const COMPTE = '9f1c2d3e-4a5b-6c7d-8e9f-0a1b2c3d4e5f'

describe('jeton de calendrier', () => {
  beforeEach(() => {
    process.env.CALENDRIER_SECRET = SECRET
  })
  afterEach(() => {
    delete process.env.CALENDRIER_SECRET
  })

  it('se relit lui-même', () => {
    const j = jetonDe(COMPTE)
    expect(j).not.toBeNull()
    expect(compteDuJeton(j as string)).toBe(COMPTE)
  })

  it('refuse une signature falsifiée', () => {
    const j = jetonDe(COMPTE) as string
    const falsifie = `${COMPTE}.${'A'.repeat(j.split('.')[1]!.length)}`
    expect(compteDuJeton(falsifie)).toBeNull()
  })

  it('refuse un jeton signé pour un autre compte', () => {
    const j = jetonDe(COMPTE) as string
    const autre = j.replace(COMPTE, '00000000-0000-0000-0000-000000000000')
    expect(compteDuJeton(autre)).toBeNull()
  })

  it('refuse un jeton sans signature', () => {
    expect(compteDuJeton(COMPTE)).toBeNull()
    expect(compteDuJeton('')).toBeNull()
  })

  it('change de jeton quand le secret change — c’est la révocation', () => {
    const avant = jetonDe(COMPTE)
    process.env.CALENDRIER_SECRET = 'un-autre-secret-tout-aussi-long'
    expect(jetonDe(COMPTE)).not.toBe(avant)
    expect(compteDuJeton(avant as string)).toBeNull()
  })

  it('ne propose rien sans secret, ou avec un secret trop court', () => {
    delete process.env.CALENDRIER_SECRET
    expect(calendrierOuvert()).toBe(false)
    expect(jetonDe(COMPTE)).toBeNull()
    process.env.CALENDRIER_SECRET = 'court'
    expect(calendrierOuvert()).toBe(false)
    expect(jetonDe(COMPTE)).toBeNull()
  })
})
