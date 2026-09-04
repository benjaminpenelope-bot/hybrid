import { describe, expect, it } from 'vitest'
import { propositionsDeReps } from './propositions'

describe('propositions de répétitions', () => {
  it('propose la plage prescrite, telle quelle', () => {
    expect(propositionsDeReps('7–10')).toEqual([7, 8, 9, 10])
    expect(propositionsDeReps('8-12')).toEqual([8, 9, 10, 11, 12])
  })

  it('encadre un nombre seul', () => {
    expect(propositionsDeReps('19')).toEqual([17, 18, 19, 20, 21])
  })

  it('lit le nombre d’une prescription par jambe', () => {
    expect(propositionsDeReps('10 / jambe')).toEqual([8, 9, 10, 11, 12])
  })

  it('avance de cinq en cinq pour des secondes', () => {
    // Proposer 44, 45, 46 secondes de gainage n'aiderait personne.
    expect(propositionsDeReps('45 s', 's')).toEqual([35, 40, 45, 50, 55])
  })

  /*
   * Un test se mesure. Proposer un chiffre reviendrait a le suggerer, et le
   * repere officiel qui en sort ne vaudrait plus rien.
   */
  it('ne propose rien pour un test', () => {
    expect(propositionsDeReps('AMRAP')).toEqual([])
    expect(propositionsDeReps('50 % du max')).toEqual([])
  })

  it('ne propose rien quand aucun nombre n’est prescrit', () => {
    expect(propositionsDeReps('jusqu’à la forme')).toEqual([])
  })

  it('ne descend jamais sous une répétition', () => {
    expect(propositionsDeReps('1')).toEqual([1, 2, 3])
  })

  it('renonce quand la plage est trop large pour une rangée', () => {
    expect(propositionsDeReps('5–30')).toEqual([3, 4, 5, 6, 7])
  })
})
