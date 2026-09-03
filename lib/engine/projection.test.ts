import { describe, expect, it } from 'vitest'
import { projection } from './projection'
import { weekVolume } from './program'

describe('projection', () => {
  it('ne projette que les sports déclarés', () => {
    const j = projection({ sports: ['running'], goal: 'marathon', baseKm: 25 })
    expect(j.some((x) => /nage/i.test(x.quoi))).toBe(false)
    expect(j.some((x) => /vélo/i.test(x.quoi))).toBe(false)
    expect(j.some((x) => /course/i.test(x.quoi))).toBe(true)
  })

  it('lit le plan au lieu de prédire une performance', () => {
    // C'est toute la difference : une prediction pourrait etre fausse, une
    // lecture de plan ne peut pas l'etre. Les chiffres doivent donc etre
    // exactement ceux que le generateur produira.
    const j = projection({ sports: ['running'], goal: 'marathon', baseKm: 25, semaines: 12 })
    const volume = j.find((x) => x.quoi === 'Course par semaine')
    expect(volume?.depart).toBe(`${weekVolume(1, 25)} km`)
    expect(volume?.arrivee).toBe(`${weekVolume(12, 25)} km`)
  })

  it('progresse toujours entre le départ et l’arrivée', () => {
    const nombre = (s: string) => Number(s.replace(',', '.').match(/[\d.]+/)?.[0] ?? 0)
    for (const j of projection({
      sports: ['running', 'swimming', 'street_workout'],
      goal: 'hybride',
      baseKm: 25,
    })) {
      expect(nombre(j.arrivee)).toBeGreaterThan(nombre(j.depart))
    }
  })

  it('projette le vélo en durée, pas en distance', () => {
    const j = projection({ sports: ['cycling'], goal: 'endurance' })
    const velo = j.find((x) => /vélo/i.test(x.quoi))
    expect(velo).toBeDefined()
    expect(velo!.arrivee).toMatch(/h|min/)
  })

  it('part de la semaine 2 pour la force, la première étant une semaine de test', () => {
    // Projeter depuis des AMRAP donnerait une fourchette vide.
    const j = projection({ sports: ['street_workout'], goal: 'force' })
    const force = j.filter((x) => /par série/.test(x.quoi))
    expect(force.length).toBeGreaterThan(0)
    expect(force.every((x) => /^\d/.test(x.depart))).toBe(true)
  })

  it('reflète le plan par défaut quand aucun sport n’est déclaré', () => {
    /*
     * Un tableau vide veut dire « on ne sait pas », pas « aucun sport » : le
     * planificateur genere alors le microcycle d'origine, et la projection
     * doit annoncer celui-la. Rendre une liste vide ici decrirait un plan
     * different de celui qui sera reellement livre.
     */
    const sans = projection({ sports: [] })
    const defaut = projection({ sports: ['running', 'swimming', 'street_workout'], goal: 'hybride' })
    expect(sans.map((j) => j.quoi)).toEqual(defaut.map((j) => j.quoi))
  })
})
