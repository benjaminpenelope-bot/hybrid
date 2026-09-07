import { describe, expect, it } from 'vitest'
import { motivation } from './motivation'

const base = { serie: 3, total: 12, finDExercice: false, graine: 'abc' }

describe('phrases du repos', () => {
  it('ne change pas sous les yeux de qui la lit', () => {
    expect(motivation(base)).toBe(motivation(base))
  })

  it('change à la série suivante', () => {
    expect(motivation({ ...base, serie: 4 })).not.toBe(motivation(base))
  })

  it('diffère d’une séance à l’autre, à série égale', () => {
    expect(motivation({ ...base, graine: 'zzz' })).not.toBe(motivation(base))
  })

  it('marque la première série', () => {
    expect(motivation({ ...base, serie: 0 })).toContain('Première série')
  })

  it('marque la dernière série de la séance', () => {
    expect(motivation({ ...base, serie: 11 })).toContain('Dernière série de la séance')
  })

  it('la fin de séance passe avant la fin d’exercice', () => {
    // Les deux sont vraies sur la derniere serie du dernier exercice : c'est
    // la fin de seance qui doit s'entendre.
    expect(motivation({ ...base, serie: 11, finDExercice: true })).toContain(
      'Dernière série de la séance',
    )
  })

  it('marque la dernière série d’un exercice', () => {
    expect(motivation({ ...base, finDExercice: true })).toContain('Dernière série de cet exercice')
  })

  it('rend toujours une phrase, même sans graine', () => {
    for (let i = 0; i < 40; i++) {
      const p = motivation({ serie: i, total: 40, finDExercice: false })
      expect(typeof p).toBe('string')
      expect(p.length).toBeGreaterThan(10)
    }
  })

  it('n’attribue aucune phrase à personne', () => {
    // Les citations d'un auteur vivant lui appartiennent : le fonds est
    // ecrit pour l'application, donc rien n'y est signe ni entre guillemets.
    for (let i = 0; i < 60; i++) {
      const p = motivation({ serie: i, total: 60, finDExercice: false, graine: 'x' })
      expect(p).not.toMatch(/[«»"]/)
      expect(p).not.toMatch(/ — [A-Z]/)
    }
  })
})
