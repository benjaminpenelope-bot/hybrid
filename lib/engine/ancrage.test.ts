import { describe, expect, it } from 'vitest'
import { baseAncreeSur, baseDuProchainBloc, volumeHebdoReel } from './ancrage'
import { weekVolume } from './program'
import type { AthleteState, ISODate, Session } from './types'

const JOUR: ISODate = '2026-09-04'

function sortie(date: ISODate, km: number): Session {
  return {
    id: date + km,
    date,
    type: 'RUN',
    kind: 'run',
    status: 'done',
    week: 1,
    title: 'Course',
    cues: [],
    duration: 40,
    intensity: 2,
    exercises: [],
    log: { km, minutes: 40 },
  } as Session
}

function etat(sessions: Session[]): AthleteState {
  return {
    profile: {} as AthleteState['profile'],
    sessions,
    weights: [],
    measures: [],
    photos: [],
    wellness: [],
    benchmarks: {} as AthleteState['benchmarks'],
    records: [],
    goals: [],
    limitations: [],
  }
}

describe('volume réellement couru', () => {
  it('moyenne les quatre dernières semaines', () => {
    // 40 km sur 28 jours = 10 km par semaine.
    const s = etat([
      sortie('2026-08-15', 10),
      sortie('2026-08-22', 10),
      sortie('2026-08-29', 10),
      sortie('2026-09-03', 10),
    ])
    expect(volumeHebdoReel(s, JOUR)).toBe(10)
  })

  /*
   * Une mesure douteuse vaut moins qu'une declaration assumee : sous trois
   * sorties, la moyenne decrit un accident plutot qu'une habitude.
   */
  it('ne dit rien sous trois sorties', () => {
    const s = etat([sortie('2026-09-01', 10), sortie('2026-09-03', 10)])
    expect(volumeHebdoReel(s, JOUR)).toBeNull()
  })

  it('ignore ce qui sort de la fenêtre', () => {
    const s = etat([
      sortie('2026-06-01', 40),
      sortie('2026-08-20', 10),
      sortie('2026-08-27', 10),
      sortie('2026-09-02', 10),
    ])
    expect(volumeHebdoReel(s, JOUR)).toBe(7.5)
  })

  it('ignore une séance sans distance enregistrée', () => {
    const s = etat([
      sortie('2026-08-20', 10),
      sortie('2026-08-27', 10),
      sortie('2026-09-02', 0),
    ])
    expect(volumeHebdoReel(s, JOUR)).toBeNull()
  })
})

describe('ancrage au milieu du plan', () => {
  /*
   * C'est la propriete qui compte : le compteur de semaines reste continu —
   * il porte la decharge et la progression de la force — et le volume vaut
   * pourtant la valeur voulue des la premiere semaine du bloc.
   */
  it('donne exactement le volume voulu à la semaine visée', () => {
    for (const [km, w] of [
      [34, 9],
      [22, 17],
      [15, 5],
    ] as const) {
      // Le plafond est fourni : sans lui il se deduirait de la base ancree,
      // qui n'est plus un volume, et mordrait des la premiere semaine.
      expect(weekVolume(w, baseAncreeSur(km, w), km * 3)).toBeCloseTo(km, 0)
    }
  })

  it('ne change rien à la semaine 1', () => {
    expect(baseAncreeSur(31, 1)).toBe(31)
  })
})

describe('base du prochain bloc', () => {
  it('retombe sur celle du profil quand rien n’est mesurable', () => {
    const r = baseDuProchainBloc(etat([]), JOUR, 9, 18.5)
    expect(r).toEqual({ baseKm: 18.5, mesuree: false })
  })

  /*
   * Le cas qui a motive le travail : dix-huit kilometres declares en aout,
   * trente reellement courus en septembre. Le plan doit repartir de trente,
   * plus dix pour cent, et non de dix-huit.
   */
  it('repart du réel quand il est mesurable', () => {
    const s = etat([
      sortie('2026-08-15', 30),
      sortie('2026-08-22', 30),
      sortie('2026-08-29', 30),
      sortie('2026-09-03', 30),
    ])
    const { baseKm, mesuree } = baseDuProchainBloc(s, JOUR, 9, 18.5)
    expect(mesuree).toBe(true)
    // 30 km/semaine mesures, plus 10 % : la semaine 9 doit valoir 33.
    expect(weekVolume(9, baseKm!, 33 * 3)).toBeCloseTo(33, 0)
  })
})
