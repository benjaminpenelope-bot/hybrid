import { describe, expect, it } from 'vitest'
import { addDays, weekday } from './date'
import {
  ABSOLUTE_MIN_BASE,
  baseWeeklyKm,
  buildLegFinisher,
  buildSession,
  generatePlan,
  isDeloadWeek,
  MIN_WEEKS_FOR_SPECIFIC,
  phaseForRace,
  raceFeasibility,
  rotatePostpone,
  runPhase,
  runSplit,
  swimTarget,
  weekVolume,
} from './program'

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
