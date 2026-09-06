import { describe, expect, it } from 'vitest'
import { dateDeLHorizon, projection, projectionDeLAthlete } from './projection'
import { weekVolume } from './program'
import type { AthleteState, Session } from './types'

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

describe('projection datée et ancrée', () => {
  const etat = (sessions: Session[], baseWeeklyKm: number | null = 15): AthleteState =>
    ({
      profile: { sports: ['running'], baseWeeklyKm } as AthleteState['profile'],
      sessions,
      weights: [],
      measures: [],
      photos: [],
      wellness: [],
      benchmarks: {} as AthleteState['benchmarks'],
      records: [],
      goals: [],
      limitations: [],
    }) as AthleteState

  const sortie = (date: string, km: number, week: number): Session =>
    ({
      id: `${date}-${km}`,
      date,
      type: 'RUN',
      kind: 'run',
      status: 'done',
      week,
      title: 'Course',
      cues: [],
      duration: 40,
      intensity: 2,
      exercises: [],
      log: { km, minutes: 40 },
    }) as Session

  it('date l’horizon à onze intervalles de sept jours', () => {
    expect(dateDeLHorizon('2026-09-06', 12)).toBe('2026-11-22')
  })

  it('part de la semaine 1 quand rien n’a été fait', () => {
    const p = projectionDeLAthlete(etat([]), '2026-09-06')
    expect(p.semaineActuelle).toBe(1)
    expect(p.semaineVisee).toBe(12)
    expect(p.ancree).toBe(false)
  })

  it('part de la semaine réellement atteinte', () => {
    const p = projectionDeLAthlete(etat([sortie('2026-09-01', 8, 9)]), '2026-09-06')
    expect(p.semaineActuelle).toBe(9)
    expect(p.semaineVisee).toBe(20)
  })

  it('s’ancre sur le volume mesuré dès trois sorties', () => {
    const p = projectionDeLAthlete(
      etat([
        sortie('2026-08-18', 10, 8),
        sortie('2026-08-25', 10, 9),
        sortie('2026-09-01', 10, 9),
      ]),
      '2026-09-06',
    )
    expect(p.ancree).toBe(true)
    // 30 km sur 28 jours = 7,5 km par semaine. Le depart doit s'en approcher,
    // et surtout ne pas valoir le volume de la semaine 9 d'un plan parti de 15.
    const volume = p.jalons.find((j) => j.quoi === 'Course par semaine')
    expect(volume).toBeDefined()
    expect(Number.parseFloat(volume!.depart.replace(',', '.'))).toBeLessThan(12)
  })

  it('ne laisse pas le volume projeté exploser au-delà du plafond', () => {
    const p = projectionDeLAthlete(
      etat([
        sortie('2026-08-18', 10, 40),
        sortie('2026-08-25', 10, 41),
        sortie('2026-09-01', 10, 42),
      ]),
      '2026-09-06',
      12,
    )
    const volume = p.jalons.find((j) => j.quoi === 'Course par semaine')
    // Plafond : trois fois les 7,5 km mesurés, soit 22,5 km.
    expect(Number.parseFloat(volume!.arrivee.replace(',', '.'))).toBeLessThanOrEqual(22.5)
  })
})
