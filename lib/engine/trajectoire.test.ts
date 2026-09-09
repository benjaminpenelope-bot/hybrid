import { describe, expect, it } from 'vitest'
import { repsPrescrites, semainesDepuisLeDebut, surHorizon, trajectoire } from './trajectoire'
import type { AthleteState, ISODate, Session } from './types'

/** Lundi 7 septembre 2026. */
const JOUR: ISODate = '2026-09-09'

const sortie = (date: ISODate, km: number, week: number, status: Session['status'] = 'done'): Session =>
  ({
    id: `${date}-${km}`,
    date,
    type: 'RUN',
    kind: 'run',
    status,
    week,
    title: 'Course',
    cues: [],
    duration: 40,
    intensity: 2,
    exercises: [],
    log: { km, minutes: 40 },
  }) as Session

const etat = (sessions: Session[], baseWeeklyKm: number | null = 18): AthleteState =>
  ({
    profile: { sports: ['running', 'swimming', 'strength'], baseWeeklyKm, allowDoubles: false },
    sessions,
    weights: [],
    measures: [],
    photos: [],
    wellness: [],
    benchmarks: {},
    records: [],
    goals: [
      { id: 'g', type: 'marathon', priority: 'principal', status: 'actif', targetDate: null, targetValue: null, targetUnit: null, note: null },
    ],
    limitations: [],
  }) as unknown as AthleteState

const histoire = [
  sortie('2026-08-18', 6, 1),
  sortie('2026-08-20', 5, 1),
  sortie('2026-08-25', 7, 2),
  sortie('2026-08-27', 5, 2),
  sortie('2026-09-01', 8, 3),
  sortie('2026-09-03', 6, 3),
]

describe('trajectoire', () => {
  it('joint le passé mesuré et l’avenir prescrit en une seule série', () => {
    const t = trajectoire(etat(histoire), JOUR, { avant: 4, apres: 6 })
    expect(t.points.slice(0, t.bascule).every((p) => p.reel)).toBe(true)
    expect(t.points.slice(t.bascule).every((p) => !p.reel)).toBe(true)
    expect(t.points).toHaveLength(t.bascule + 6)
  })

  it('mesure le passé sur les séances enregistrées', () => {
    const t = trajectoire(etat(histoire), JOUR, { avant: 4, apres: 4 })
    const semaineDu25 = t.points.find((p) => p.lundi === '2026-08-24')
    expect(semaineDu25?.valeur).toBe(12)
    expect(semaineDu25?.reel).toBe(true)
  })

  it('ne remonte pas avant la première séance : on n’observait rien', () => {
    const t = trajectoire(etat([sortie('2026-09-01', 8, 3)]), JOUR, { avant: 12, apres: 4 })
    // Une seule semaine close depuis la premiere seance.
    expect(t.bascule).toBeLessThanOrEqual(1)
  })

  it('projette la semaine en cours plutôt que de la mesurer à moitié', () => {
    const t = trajectoire(etat(histoire), JOUR, { avant: 4, apres: 4 })
    // Le lundi de la semaine en cours ouvre la partie projetee.
    expect(t.points[t.bascule]?.lundi).toBe('2026-09-07')
    expect(t.points[t.bascule]?.reel).toBe(false)
  })

  it('s’ancre sur le volume mesuré quand l’historique le permet', () => {
    const t = trajectoire(etat(histoire), JOUR, { avant: 4, apres: 4 })
    expect(t.ancree).toBe(true)
    // Six sorties, 37 km sur 28 jours : le depart doit rester du meme ordre,
    // et surtout pas repartir du volume declare a l'inscription.
    expect(t.depart).toBeLessThan(20)
  })

  it('marque les semaines de décharge', () => {
    const t = trajectoire(etat(histoire), JOUR, { avant: 0, apres: 8 })
    const decharges = t.points.filter((p) => p.decharge)
    expect(decharges.length).toBeGreaterThan(0)
    // Une decharge est un creux : elle court moins que la semaine d'avant.
    for (const d of decharges) {
      const i = t.points.indexOf(d)
      if (i > 0) expect(d.valeur).toBeLessThan(t.points[i - 1]!.valeur)
    }
  })

  it('totalise ce que le plan fait courir d’ici l’horizon', () => {
    const t = trajectoire(etat(histoire), JOUR, { avant: 4, apres: 6 })
    const somme = t.points.slice(t.bascule).reduce((a, p) => a + p.valeur, 0)
    expect(t.cumulAVenir).toBe(Math.round(somme))
  })

  it('date les paliers que la sortie longue atteint', () => {
    const t = trajectoire(etat(histoire), JOUR, { avant: 4, apres: 40 })
    expect(t.paliers.length).toBeGreaterThan(0)
    // Ils sont dans l'ordre, et chacun est date d'un lundi a venir.
    for (let i = 1; i < t.paliers.length; i++) {
      expect(t.paliers[i]!.km).toBeGreaterThan(t.paliers[i - 1]!.km)
      expect(t.paliers[i]!.quand >= t.paliers[i - 1]!.quand).toBe(true)
    }
  })

  it('nomme les distances qui ont un nom', () => {
    // Il faut un volume qui permette d'y arriver : le plafond de volume
    // borne la sortie longue, et un coureur a dix kilometres par semaine
    // n'atteint jamais le semi, ce que la trajectoire dit sans le farder.
    const costaud = Array.from({ length: 16 }, (_, i) =>
      sortie(addJours('2026-08-12', i * 2), 12, 12),
    )
    const t = trajectoire(etat(costaud, 40), JOUR, { avant: 0, apres: 60 })
    const semi = t.paliers.find((p) => p.km === 21.1)
    expect(semi?.nom).toBe('semi-marathon')
  })

  it('n’annonce pas un palier que le plafond de volume rend inatteignable', () => {
    // Neuf kilometres par semaine mesures : le plafond borne la sortie longue
    // bien avant le semi. Le promettre serait une invention.
    const t = trajectoire(etat(histoire), JOUR, { avant: 0, apres: 60 })
    expect(t.paliers.some((p) => p.km === 42.2)).toBe(false)
  })

  it('n’annonce pas un palier déjà dépassé', () => {
    // Un coureur a 60 km par semaine passe les dix kilometres depuis
    // longtemps : le lui annoncer serait du bruit, pas une nouvelle.
    const gros = Array.from({ length: 12 }, (_, i) =>
      sortie(addJours('2026-08-10', i * 2), 20, 20),
    )
    const t = trajectoire(etat(gros, 60), JOUR, { avant: 4, apres: 12 })
    expect(t.paliers.some((p) => p.km === 5)).toBe(false)
  })

  it('ne casse pas sur un compte sans aucune séance', () => {
    const t = trajectoire(etat([]), JOUR, { avant: 8, apres: 12 })
    expect(t.bascule).toBe(0)
    expect(t.points).toHaveLength(12)
    expect(t.ancree).toBe(false)
  })
})

function addJours(d: string, n: number): ISODate {
  const t = new Date(d)
  t.setDate(t.getDate() + n)
  return t.toISOString().slice(0, 10)
}

describe('changement d’horizon', () => {
  const complet = trajectoire(etat(histoire), JOUR, { avant: 4, apres: 52 })

  it('découpe sans recalculer', () => {
    const court = surHorizon(complet, 8)
    expect(court.points).toHaveLength(complet.bascule + 8)
    // Une semaine vaut la meme chose quel que soit l'horizon regarde.
    for (let i = 0; i < court.points.length; i++) {
      expect(court.points[i]!.valeur).toBe(complet.points[i]!.valeur)
    }
  })

  it('recalcule l’arrivée et le total sur la découpe', () => {
    const court = surHorizon(complet, 6)
    expect(court.arrivee).toBe(court.points[court.points.length - 1]!.valeur)
    expect(court.cumulAVenir!).toBeLessThan(complet.cumulAVenir!)
  })

  it('ne garde que les paliers atteints dans l’horizon', () => {
    const court = surHorizon(complet, 4)
    for (const p of court.paliers) {
      expect(p.semaine).toBeLessThanOrEqual(court.points[court.points.length - 1]!.semaine)
    }
    expect(court.paliers.length).toBeLessThanOrEqual(complet.paliers.length)
  })
})

describe('disciplines', () => {
  const nage = (date: string, continu: number, week: number): Session =>
    ({ id: date + continu, date, type: 'SWIM', kind: 'swim', status: 'done', week,
       title: 'Nage', cues: [], duration: 45, intensity: 2, exercises: [],
       log: { distance: 600, continuous: continu, minutes: 45 } }) as Session

  const barre = (date: string, reps: number, week: number): Session =>
    ({ id: date + reps, date, type: 'UPPER', kind: 'strength', status: 'done', week,
       title: 'Haut', cues: [], duration: 50, intensity: 3, exercises: [],
       log: { reps, minutes: 50 } }) as Session

  const complet = etat([...histoire, nage('2026-08-26', 100, 2), barre('2026-08-24', 180, 2)])

  it('natation : le passé est la meilleure distance enchaînée, pas la somme', () => {
    const s = etat([nage('2026-08-25', 100, 2), nage('2026-08-27', 150, 2)])
    const t = trajectoire(s, JOUR, { avant: 4, apres: 4, discipline: 'natation' })
    const semaine = t.points.find((p) => p.lundi === '2026-08-24')
    // 150 et non 250 : un palier ne s'additionne pas.
    expect(semaine?.valeur).toBe(150)
  })

  it('natation : la projection lit l’échelle du programme', () => {
    const t = trajectoire(complet, JOUR, { avant: 2, apres: 30, discipline: 'natation' })
    const futurs = t.points.slice(t.bascule)
    // L'echelle monte par paliers, jamais elle ne redescend.
    for (let i = 1; i < futurs.length; i++) {
      expect(futurs[i]!.valeur).toBeGreaterThanOrEqual(futurs[i - 1]!.valeur)
    }
    expect(t.paliers.length).toBeGreaterThan(0)
  })

  it('natation : pas de cumul, un palier ne s’additionne pas', () => {
    const t = trajectoire(complet, JOUR, { avant: 2, apres: 12, discipline: 'natation' })
    expect(t.cumulAVenir).toBeNull()
  })

  it('force : le passé compte les répétitions enregistrées', () => {
    const t = trajectoire(complet, JOUR, { avant: 4, apres: 4, discipline: 'force' })
    expect(t.points.find((p) => p.lundi === '2026-08-24')?.valeur).toBe(180)
  })

  it('force : la projection prescrit un volume, elle ne prédit aucun maximum', () => {
    const t = trajectoire(complet, JOUR, { avant: 2, apres: 12, discipline: 'force' })
    expect(t.points.slice(t.bascule).every((p) => p.valeur > 0)).toBe(true)
    // Aucun palier : le programme prescrit des series, il ne devine pas un max.
    expect(t.paliers).toEqual([])
    expect(t.cumulAVenir).not.toBeNull()
  })

  it('la course reste inchangée', () => {
    const a = trajectoire(etat(histoire), JOUR, { avant: 4, apres: 6 })
    const b = trajectoire(etat(histoire), JOUR, { avant: 4, apres: 6, discipline: 'course' })
    expect(a).toEqual(b)
  })
})

describe('répétitions prescrites', () => {
  it('prend le bas de la fourchette, pas le haut', () => {
    expect(repsPrescrites('7–10')).toBe(7)
  })

  it('compte double un exercice par jambe', () => {
    expect(repsPrescrites('10 / jambe')).toBe(20)
  })

  it('écarte le gainage : ce sont des secondes', () => {
    expect(repsPrescrites('45 s', 's')).toBe(0)
  })

  it('écarte un test : le nombre est justement celui qu’on ne connaît pas', () => {
    expect(repsPrescrites('AMRAP')).toBe(0)
    expect(repsPrescrites('50 % du max')).toBe(0)
  })
})

describe('vue depuis l’ouverture du compte', () => {
  it('compte les semaines depuis la première séance', () => {
    // Premiere seance le 18 aout, semaine du 17 ; aujourd'hui semaine du 7
    // septembre : trois semaines separent les deux lundis.
    expect(semainesDepuisLeDebut(etat(histoire), JOUR)).toBe(3)
  })

  it('rend zéro sans aucune séance', () => {
    expect(semainesDepuisLeDebut(etat([]), JOUR)).toBe(0)
  })

  it('borne un compte ancien', () => {
    expect(semainesDepuisLeDebut(etat([sortie('2015-01-05', 5, 1)]), JOUR)).toBe(156)
  })

  it('couvre tout l’historique sans jamais remonter avant lui', () => {
    const s = etat(histoire)
    const t = trajectoire(s, JOUR, { avant: semainesDepuisLeDebut(s, JOUR), apres: 0 })
    expect(t.bascule).toBe(t.points.length)
    expect(t.points[0]!.lundi).toBe('2026-08-17')
    expect(t.points.every((p) => p.reel)).toBe(true)
  })

  it('ne marque aucune décharge sur le passé', () => {
    // Une semaine legere peut etre une decharge prescrite ou une semaine
    // manquee : rien dans la donnee ne permet de trancher.
    const t = trajectoire(etat(histoire), JOUR, { avant: 8, apres: 8 })
    expect(t.points.slice(0, t.bascule).some((p) => p.decharge)).toBe(false)
    expect(t.points.slice(t.bascule).some((p) => p.decharge)).toBe(true)
  })
})

describe('semaine en cours', () => {
  const avecAujourdhui = [...histoire, sortie('2026-09-08', 5.5, 4)]

  it('revient dans le passé quand il n’y a pas de projection', () => {
    const s = etat(avecAujourdhui)
    const t = trajectoire(s, JOUR, { avant: semainesDepuisLeDebut(s, JOUR), apres: 0 })
    const dernier = t.points[t.points.length - 1]!
    expect(dernier.lundi).toBe('2026-09-07')
    expect(dernier.reel).toBe(true)
    // La sortie du jour meme doit compter : sans elle, la courbe s'arretait
    // au dimanche precedent et le kilometrage du jour disparaissait.
    expect(dernier.valeur).toBe(5.5)
  })

  it('reste dans la projection dès qu’il y en a une', () => {
    const t = trajectoire(etat(avecAujourdhui), JOUR, { avant: 4, apres: 4 })
    const bascule = t.points[t.bascule]!
    expect(bascule.lundi).toBe('2026-09-07')
    expect(bascule.reel).toBe(false)
    // Et elle n'est jamais comptee deux fois.
    expect(t.points.filter((p) => p.lundi === '2026-09-07')).toHaveLength(1)
  })
})
