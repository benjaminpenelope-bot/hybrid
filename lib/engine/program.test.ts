import { describe, expect, it } from 'vitest'
import { addDays, weekday } from './date'
import {
  ABSOLUTE_MIN_BASE,
  baseWeeklyKm,
  buildLegFinisher,
  buildSession,
  buildStrength,
  decalerReps,
  doserPourObjectif,
  generatePlan,
  isDeloadWeek,
  MIN_WEEKS_FOR_SPECIFIC,
  phaseForRace,
  raceFeasibility,
  rotatePostpone,
  runPhase,
  runSplit,
  estFootingSouple,
  kmDesCourses,
  microcycleDe,
  swimTarget,
  typePraticable,
  typeRetenu,
  weekVolume,
} from './program'
import type { GoalType, SessionType, Sport } from './types'

/** Lundi 16 mars 2026. Toutes les dates des tests en découlent. */
const MONDAY = '2026-03-16'

const opts = { makeId: (() => { let i = 0; return () => `s${++i}` })() }

describe('weekVolume', () => {
  it('part de 15 km et progresse de 8 % par semaine', () => {
    expect(weekVolume(1)).toBe(15)
    expect(weekVolume(2)).toBe(16)
    expect(weekVolume(3)).toBe(17.5)
  })

  it('applique un deload de 30 % toutes les 4 semaines', () => {
    expect(isDeloadWeek(4)).toBe(true)
    expect(isDeloadWeek(8)).toBe(true)
    expect(isDeloadWeek(3)).toBe(false)
    // semaine 4 : 18,9 km theoriques ramenes à 13
    expect(weekVolume(4)).toBe(13)
    expect(weekVolume(4)).toBeLessThan(weekVolume(3))
    // la progression reprend ensuite au niveau attendu
    expect(weekVolume(5)).toBe(20.5)
  })

  it('repartit le volume entre footing, endurance et sortie longue', () => {
    for (const w of [1, 4, 12, 27]) {
      const s = runSplit(w)
      expect(s.easy + s.fundamental + s.long).toBeCloseTo(weekVolume(w), 5)
      expect(s.long).toBeGreaterThan(s.easy)
    }
  })
})

describe('phases', () => {
  it('suit le compteur de semaines sans date de course', () => {
    expect(runPhase(1).key).toBe('BASE')
    expect(runPhase(12).key).toBe('BASE')
    expect(runPhase(13).key).toBe('BUILD')
    expect(runPhase(26).key).toBe('BUILD')
    expect(runPhase(27).key).toBe('SPECIFIC')
    expect(runPhase(42).key).toBe('SPECIFIC')
    expect(runPhase(43).key).toBe('TAPER')
    expect(runPhase(46).key).toBe('RACE')
  })

  it('se cale sur la date de course quand elle est connue', () => {
    const race = addDays(MONDAY, 7 * 45)
    expect(phaseForRace(MONDAY, race).key).toBe('BASE')
    expect(phaseForRace(addDays(MONDAY, 7 * 13), race).key).toBe('BUILD')
    expect(phaseForRace(addDays(MONDAY, 7 * 30), race).key).toBe('SPECIFIC')
    expect(phaseForRace(addDays(MONDAY, 7 * 43), race).key).toBe('TAPER')
    expect(phaseForRace(race, race).key).toBe('RACE')
  })

  it('signale un calendrier trop court pour la phase spécifique', () => {
    const tooSoon = raceFeasibility(MONDAY, addDays(MONDAY, 7 * 10))
    expect(tooSoon.sufficient).toBe(false)
    expect(tooSoon.weeksAvailable).toBe(10)
    expect(tooSoon.message).toContain(String(MIN_WEEKS_FOR_SPECIFIC))

    const ok = raceFeasibility(MONDAY, addDays(MONDAY, 7 * 40))
    expect(ok.sufficient).toBe(true)

    expect(raceFeasibility(MONDAY, addDays(MONDAY, -7)).sufficient).toBe(false)
  })
})

describe('microcycle', () => {
  it('place un seul jour de repos et aucun double par défaut', () => {
    const plan = generatePlan(MONDAY, 1, 1, opts)
    expect(plan.map((s) => s.type)).toEqual([
      'REST',
      'UPPER',
      'RUN',
      'SWIM',
      'RUN',
      'SWIM',
      'LONG',
    ])
    expect(plan.filter((s) => s.extra).length).toBe(0)
  })

  it('enchaîné le bloc jambes au footing du mercredi', () => {
    const plan = generatePlan(MONDAY, 1, 1, opts)
    const wednesday = plan[2]
    expect(wednesday?.finisher?.duration).toBe(12)
    expect(wednesday?.duration).toBeGreaterThan(12)
    // le footing souple du vendredi n'a pas de bloc jambes
    expect(plan[4]?.finisher).toBeNull()
  })

  it('rend une séance LOWER complète et un double quand ils sont autorises', () => {
    const plan = generatePlan(MONDAY, 1, 1, { ...opts, allowDoubles: true })
    const saturday = plan[5]
    expect(saturday?.type).toBe('LOWER')
    expect(saturday?.duration).toBe(45)
    expect(saturday?.extra?.type).toBe('SWIM')
    // sans bloc enchaîné sur le footing, puisque les jambes ont leur séance
    expect(plan[2]?.finisher).toBeNull()
  })

  it('déplace tout le microcycle avec le jour de repos', () => {
    const plan = generatePlan(MONDAY, 1, 1, { ...opts, restWeekday: 0 })
    const sunday = plan.find((s) => weekday(s.date) === 0)
    expect(sunday?.type).toBe('REST')
    expect(plan.find((s) => weekday(s.date) === 1)?.type).toBe('UPPER')
    expect(plan.find((s) => weekday(s.date) === 6)?.type).toBe('LONG')
  })

  it('généré autant de séances que de jours demandés', () => {
    const plan = generatePlan(MONDAY, 8, 1, opts)
    expect(plan).toHaveLength(56)
    expect(plan[0]?.week).toBe(1)
    expect(plan[55]?.week).toBe(8)
  })

  it('programme les tests de repères en semaine 1 uniquement', () => {
    const w1 = buildSession(addDays(MONDAY, 1), 1, 2, undefined, opts)
    const w2 = buildSession(addDays(MONDAY, 8), 2, 2, undefined, opts)
    expect(w1.exercises.filter((e) => e.test).length).toBe(4)
    expect(w2.exercises.filter((e) => e.test).length).toBe(0)
  })

  it('recharge le contenu type quand l editeur change le type du jour', () => {
    const forced = buildSession(MONDAY, 3, 1, 'SWIM', opts)
    expect(forced.type).toBe('SWIM')
    expect(forced.kind).toBe('swim')
    expect(forced.target).toBe(swimTarget(3).session)
  })
})

describe('swimTarget', () => {
  it('monte d un palier toutes les 3 semaines', () => {
    expect(swimTarget(1).d).toBe(50)
    expect(swimTarget(3).d).toBe(50)
    expect(swimTarget(4).d).toBe(75)
    expect(swimTarget(34).d).toBe(1500)
    // pas de dépassement au-delà de l échelle
    expect(swimTarget(80).d).toBe(1500)
  })
})

describe('buildLegFinisher', () => {
  it('reste court et loin de l échec', () => {
    const f = buildLegFinisher(1)
    expect(f.duration).toBe(12)
    expect(f.exercises.every((e) => e.rir >= 2)).toBe(true)
  })
})

describe('rotatePostpone', () => {
  it('echange la séance avec celle du lendemain', () => {
    const plan = generatePlan(MONDAY, 1, 1, opts)
    const tuesday = plan[1]!
    const wednesday = plan[2]!
    const next = rotatePostpone(plan, tuesday.id)
    expect(next.find((s) => s.id === tuesday.id)?.date).toBe(wednesday.date)
    expect(next.find((s) => s.id === wednesday.id)?.date).toBe(tuesday.date)
    expect(next.find((s) => s.id === tuesday.id)?.moved).toBe(true)
  })

  it('déplace simplement la séance si le lendemain est libre', () => {
    const full = generatePlan(MONDAY, 1, 1, opts)
    const plan = [full[0]!, full[3]!] // lundi et jeudi : mardi est libre
    const monday = plan[0]!
    const next = rotatePostpone(plan, monday.id)
    expect(next.find((s) => s.id === monday.id)?.date).toBe(addDays(MONDAY, 1))
    expect(next.find((s) => s.id === plan[1]!.id)?.date).toBe(plan[1]!.date)
  })

  it('ignore un identifiant inconnu', () => {
    const plan = generatePlan(MONDAY, 1, 1, opts)
    expect(rotatePostpone(plan, 'inconnu')).toBe(plan)
  })
})

describe('baseWeeklyKm', () => {
  it('ancre la première semaine sur le volume actuel, +10 % au plus', () => {
    expect(baseWeeklyKm(20)).toBe(22)
    expect(baseWeeklyKm(40)).toBe(44)
    expect(baseWeeklyKm(13.6)).toBe(15)
  })

  it('ne fait jamais tripler la charge d un débutant', () => {
    // 5 km par semaine : le programme démarre à 8 km, pas à 15
    expect(baseWeeklyKm(5)).toBe(8)
    expect(weekVolume(1, baseWeeklyKm(5))).toBe(8)
  })

  it('ne fait pas régresser un coureur déjà installé', () => {
    expect(weekVolume(1, baseWeeklyKm(40))).toBeGreaterThanOrEqual(40)
  })

  it('donne un plancher praticable à qui ne court pas encore', () => {
    expect(baseWeeklyKm(0)).toBe(ABSOLUTE_MIN_BASE)
    expect(baseWeeklyKm(-5)).toBe(ABSOLUTE_MIN_BASE)
    expect(baseWeeklyKm(NaN)).toBe(ABSOLUTE_MIN_BASE)
  })

  it('conserve la progression et le deload quelle que soit la base', () => {
    const base = baseWeeklyKm(5)
    expect(weekVolume(2, base)).toBeGreaterThan(weekVolume(1, base))
    expect(weekVolume(4, base)).toBeLessThan(weekVolume(3, base))
  })

  it('propage la base jusqu au contenu des séances', () => {
    const plan = generatePlan(MONDAY, 1, 1, { ...opts, baseKm: baseWeeklyKm(5) })
    const long = plan.find((s) => s.type === 'LONG')
    // 8 km de base : la sortie longue tourne autour de 3,5 km, pas de 6,5
    expect(long?.title).toContain('3.5 km')
  })
})


describe('sports declares', () => {
  const plan = (sports: Sport[], availableWeekdays: number[] = []) =>
    generatePlan(MONDAY, 1, 1, {
      restWeekday: 1,
      sports,
      availableWeekdays,
      makeId: (() => {
        let i = 0
        return () => `p${++i}`
      })(),
    })

  it('ne programme aucune nage a qui ne nage pas', () => {
    const types = plan(['running', 'strength']).map((s) => s.type)
    expect(types).not.toContain('SWIM')
  })

  it('remplace la nage par de la course plutot que par de la force', () => {
    // Rester dans la famille endurance preserve l'equilibre du microcycle.
    expect(typeRetenu('SWIM', ['running', 'strength'])).toBe('RUN')
  })

  it('met au repos ce qu’aucun sport declare ne permet', () => {
    // Un nageur seul ne peut pas faire les seances de force du microcycle.
    expect(typeRetenu('UPPER', ['swimming'])).toBe('SWIM')
    expect(typeRetenu('LONG', ['strength'])).toBe('LOWER')
  })

  it('ne touche a rien quand aucun sport n’est declare', () => {
    // Tableau vide = « on ne sait pas ». Vider le programme des comptes
    // anterieurs au questionnaire serait pire que de le laisser tel quel.
    expect(typeRetenu('SWIM', [])).toBe('SWIM')
    expect(plan([]).filter((s) => s.type === 'SWIM').length).toBeGreaterThan(0)
  })

  it('retire le bloc jambes a qui ne declare aucune force', () => {
    const footings = plan(['running', 'swimming']).filter((s) => s.type === 'RUN')
    expect(footings.length).toBeGreaterThan(0)
    expect(footings.every((s) => s.finisher === null)).toBe(true)
  })

  it('garde le bloc jambes quand la force est declaree', () => {
    const footings = plan(['running', 'street_workout']).filter((s) => s.type === 'RUN')
    expect(footings.some((s) => s.finisher !== null)).toBe(true)
  })

  it('le cyclisme ne remplace jamais rien : aucune seance ne s’en deduit', () => {
    expect(typePraticable('RUN', ['cycling'])).toBe(false)
    expect(typeRetenu('RUN', ['cycling'])).toBe('REST')
  })
})

describe('jours disponibles', () => {
  const plan = (availableWeekdays: number[]) =>
    generatePlan(MONDAY, 1, 1, {
      restWeekday: 1,
      availableWeekdays,
      sports: ['running', 'swimming', 'street_workout'],
      makeId: (() => {
        let i = 0
        return () => `d${++i}`
      })(),
    })

  it('ne programme rien un jour ou l’athlete n’est pas disponible', () => {
    // Mardi, jeudi, samedi.
    const dispo = [2, 4, 6]
    const seances = plan(dispo).filter((s) => s.type !== 'REST')
    expect(seances.every((s) => dispo.includes(weekday(s.date)))).toBe(true)
  })

  it('produit autant de seances que de jours declares, au plus', () => {
    expect(plan([2, 4, 6]).filter((s) => s.type !== 'REST')).toHaveLength(3)
  })

  it('conserve la semaine complete quand la disponibilite est inconnue', () => {
    const s = generatePlan(MONDAY, 1, 1, { restWeekday: 1, makeId: () => 'x' })
    expect(s.filter((x) => x.type !== 'REST').length).toBe(6)
  })
})


describe('microcycle par objectif', () => {
  const semaine = (goal: GoalType | null) =>
    generatePlan(MONDAY, 1, 1, {
      restWeekday: 1,
      goal,
      makeId: (() => {
        let i = 0
        return () => `m${++i}`
      })(),
    }).map((s) => s.type)

  const compte = (types: SessionType[], t: SessionType) => types.filter((x) => x === t).length

  it('donne plus de barre que de course a un objectif de force', () => {
    // C'est le defaut corrige : l'objectif force recevait trois sorties de
    // course et une seule seance de barre.
    const t = semaine('force')
    const barre = compte(t, 'UPPER') + compte(t, 'LOWER')
    const course = compte(t, 'RUN') + compte(t, 'LONG')
    expect(barre).toBeGreaterThan(course)
  })

  it('garde la course dominante pour un marathon', () => {
    const t = semaine('marathon')
    expect(compte(t, 'RUN') + compte(t, 'LONG')).toBe(3)
    expect(compte(t, 'LONG')).toBe(1)
  })

  it('ne programme aucune sortie longue sur un objectif de force', () => {
    // Elle n'a aucun sens quand l'objectif ne porte pas sur une distance.
    expect(semaine('force')).not.toContain('LONG')
    expect(semaine('street_workout')).not.toContain('LONG')
  })

  it('garde la sortie longue pour un HYROX, qui court huit kilometres', () => {
    expect(semaine('hyrox')).toContain('LONG')
  })

  it('ne repete jamais un groupe musculaire a moins de trois jours', () => {
    for (const goal of ['force', 'hypertrophie', 'street_workout', 'hyrox'] as GoalType[]) {
      const micro = microcycleDe(goal)
      for (const type of ['UPPER', 'LOWER'] as SessionType[]) {
        const jours = ([0, 1, 2, 3, 4, 5, 6] as const).filter((s) => micro[s] === type)
        for (let i = 1; i < jours.length; i++) {
          expect(jours[i]! - jours[i - 1]!).toBeGreaterThanOrEqual(3)
        }
      }
    }
  })

  it('laisse le jour 0 au repos quel que soit l’objectif', () => {
    // Le jour de repos vient du profil, pas de l'objectif.
    const tous: GoalType[] = [
      'marathon', 'semi', 'dix_km', 'hyrox', 'force',
      'hypertrophie', 'street_workout', 'endurance', 'hybride',
    ]
    for (const goal of tous) expect(microcycleDe(goal)[0]).toBe('REST')
  })

  it('conserve la repartition d’origine sans objectif declare', () => {
    expect(semaine(null)).toEqual(semaine('hybride'))
  })
})

describe('volume de course reparti', () => {
  it('ne concentre jamais la semaine dans une sortie demesuree', () => {
    // Renormaliser pour conserver le volume hebdomadaire donnait un
    // « footing souple » de 18 km sur un objectif de force.
    const plafond = runSplit(3, 30).long
    for (const goal of ['marathon', 'force', 'street_workout', 'hyrox'] as GoalType[]) {
      for (const km of kmDesCourses(3, 30, microcycleDe(goal)).values()) {
        expect(km).toBeLessThanOrEqual(plafond)
      }
    }
  })

  it('fait moins courir un objectif de force qu’un objectif de marathon', () => {
    // Consequence assumee du choix d'objectif, pas une perte accidentelle.
    const total = (goal: GoalType) =>
      [...kmDesCourses(3, 30, microcycleDe(goal)).values()].reduce((a, b) => a + b, 0)
    expect(total('force')).toBeLessThan(total('marathon'))
  })

  it('donne le volume d’origine a un objectif de course', () => {
    const total = [...kmDesCourses(3, 30, microcycleDe('marathon')).values()].reduce(
      (a, b) => a + b,
      0,
    )
    expect(Math.abs(total - weekVolume(3, 30))).toBeLessThanOrEqual(1)
  })

  it('designe le dernier footing de la semaine comme footing souple', () => {
    // Reproduit le comportement d'origine, ou c'etait le slot 4.
    expect(estFootingSouple(4, microcycleDe('marathon'))).toBe(true)
    expect(estFootingSouple(2, microcycleDe('marathon'))).toBe(false)
  })
})

describe('dosage de la force selon l’objectif', () => {
  const haut = (goal: GoalType | null) => doserPourObjectif(buildStrength('UPPER', 4), goal)
  const traction = (goal: GoalType | null) => haut(goal).find((e) => e.n === 'Tractions strictes')!

  it('ne touche à rien sans objectif déclaré', () => {
    expect(haut(null)).toEqual(buildStrength('UPPER', 4))
  })

  it('raccourcit les séries et allonge le repos pour la force', () => {
    // En poids de corps on ne devient pas fort en en faisant plus, mais en
    // rendant chaque repetition plus dure.
    const base = traction(null)
    const f = traction('force')
    expect(f.rest).toBeGreaterThan(base.rest)
    expect(Number(f.reps.split('–')[0])).toBeLessThan(Number(base.reps.split('–')[0]))
  })

  it('allonge les séries et raccourcit le repos pour l’hypertrophie', () => {
    const base = traction(null)
    const h = traction('hypertrophie')
    expect(h.rest).toBeLessThan(base.rest)
    expect(Number(h.reps.split('–')[0])).toBeGreaterThan(Number(base.reps.split('–')[0]))
    expect(h.rir).toBeLessThan(base.rir)
  })

  it('ne descend jamais sous un repos tenable', () => {
    // 60 s reduites de 30 % donnaient 42 s entre deux series de releves de
    // jambes : une consigne que personne ne suit.
    for (const e of haut('hypertrophie')) expect(e.rest).toBeGreaterThanOrEqual(45)
  })

  it('laisse les séries de test intactes', () => {
    // Decaler un test de maximum le viderait de son sens — c'est le repere
    // meme que l'application refuse d'inventer.
    const semaine1 = doserPourObjectif(buildStrength('UPPER', 1), 'hypertrophie')
    const tests = semaine1.filter((e) => e.test)
    expect(tests.length).toBeGreaterThan(0)
    expect(tests.every((e) => e.reps === 'AMRAP' && e.rir === 0)).toBe(true)
  })

  it('ne modifie pas une consigne non chiffrée', () => {
    expect(decalerReps('AMRAP', -2)).toBe('AMRAP')
    expect(decalerReps('50 % du max', 3)).toBe('50 % du max')
  })

  it('garde une fourchette cohérente près du plancher', () => {
    // Le bas ne descend pas sous 3, et le haut reste au-dessus du bas.
    expect(decalerReps('4–5', -5)).toBe('3–4')
  })
})
