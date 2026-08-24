import { addDays, daysBetween } from './date'
import { acuteChronic, consecutiveDays } from './load'
import { sum } from './math'
import { raceFeasibility } from './program'
import { computeScores } from './scoring'
import { BENCHMARK_LABELS, benchmarkValue, isPartial } from './state'
import type { AthleteState, BenchmarkKey, ISODate, Scores } from './types'

/**
 * SIGNAUX AUTOMATIQUES
 *
 * Dix règles, chacune adossée à une donnée réellement mesurée. Une règle dont
 * la donnée manque ne se déclenche pas : l'absence de signal ne vaut jamais
 * feu vert, elle est visible dans la couverture du score.
 */

export type AlertLevel = 'critical' | 'warn' | 'info'

export type AlertId =
  | 'acwr'
  | 'streak'
  | 'pain'
  | 'sleep'
  | 'fatigue'
  | 'weight_rate'
  | 'run_jump'
  | 'swim_stagnation'
  | 'benchmarks_missing'
  | 'race_feasibility'

export type AlertTarget = 'recovery' | 'body' | 'perf' | 'week' | 'coach' | 'goals'

export interface Alert {
  id: AlertId
  level: AlertLevel
  title: string
  body: string
  /** La donnée mesurée qui déclenche le signal. Toujours affichable. */
  evidence: string
  target: AlertTarget
}

const LEVEL_RANK: Record<AlertLevel, number> = { critical: 0, warn: 1, info: 2 }
const ID_RANK: AlertId[] = [
  'pain',
  'acwr',
  'streak',
  'fatigue',
  'sleep',
  'run_jump',
  'race_feasibility',
  'weight_rate',
  'swim_stagnation',
  'benchmarks_missing',
]

export interface AlertContext {
  scores?: Scores
}

export function computeAlerts(
  state: AthleteState,
  today: ISODate,
  ctx: AlertContext = {},
): Alert[] {
  const out: Alert[] = []
  const scores = ctx.scores ?? computeScores(state, today)

  /* 1 — Ratio aigu / chronique. Base sur les charges sRPE enregistrées. */
  const { acwr, l7, reliable } = acuteChronic(state, today)
  if (reliable) {
    if (acwr > 1.5) {
      out.push({
        id: 'acwr',
        level: 'critical',
        title: 'Charge en hausse trop brutale',
        body: "Tu montes plus vite que ce que ton corps a absorbé. Allège la semaine : garde les séances, retire une série ou 20 % de la distance.",
        evidence: `Ratio aigu/chronique ${acwr.toFixed(2)} · charge 7 j ${l7} u`,
        target: 'recovery',
      })
    } else if (acwr > 1.3) {
      out.push({
        id: 'acwr',
        level: 'warn',
        title: 'Progression de charge à surveiller',
        body: 'Au-delà de 1,3 le risque de blessure de surcharge augmente. Ne rajoute rien cette semaine.',
        evidence: `Ratio aigu/chronique ${acwr.toFixed(2)} · charge 7 j ${l7} u`,
        target: 'recovery',
      })
    } else if (acwr < 0.8) {
      out.push({
        id: 'acwr',
        level: 'info',
        title: 'Charge en baisse',
        body: 'Tu as de la marge pour remonter progressivement. Reprends le volume prévu sans le dépasser.',
        evidence: `Ratio aigu/chronique ${acwr.toFixed(2)} · charge 7 j ${l7} u`,
        target: 'recovery',
      })
    }
  }

  /* 2 — Jours consécutifs sans coupure. */
  const streak = consecutiveDays(state, today)
  if (streak >= 8) {
    out.push({
      id: 'streak',
      level: 'critical',
      title: 'Aucune coupure depuis trop longtemps',
      body: "Prends un vrai jour de repos aujourd'hui. Les adaptations se font au repos, pas à l'entraînement.",
      evidence: `${streak} jours consécutifs avec séance`,
      target: 'week',
    })
  } else if (streak >= 6) {
    out.push({
      id: 'streak',
      level: 'warn',
      title: 'Six jours sans coupure',
      body: 'Le jour de repos du microcycle approche. Ne le sacrifie pas pour rattraper une séance.',
      evidence: `${streak} jours consécutifs avec séance`,
      target: 'week',
    })
  }

  /* 3 — Douleur signalée dans les 3 derniers jours. */
  const painFrom = addDays(today, -3)
  const painWellness = state.wellness.find(
    (x) => x.date > painFrom && x.date <= today && !!x.soreness?.trim(),
  )
  const painSession = state.sessions.find(
    (x) => x.date > painFrom && x.date <= today && !!x.pain?.trim(),
  )
  const pain = painWellness?.soreness?.trim() || painSession?.pain?.trim()
  if (pain) {
    out.push({
      id: 'pain',
      level: 'critical',
      title: 'Douleur signalée',
      body: "Réduis ou interromps l'activité concernée. Si elle persiste au-delà de quelques jours, si elle s'aggrave à l'effort ou réveille la nuit, consulte un professionnel de santé. Cette application ne pose aucun diagnostic.",
      evidence: `« ${pain} » le ${painWellness?.date ?? painSession?.date}`,
      target: 'recovery',
    })
  }

  /* 4 — Sommeil moyen sur les relevés de la semaine. */
  const sleepFrom = addDays(today, -7)
  const sleeps = state.wellness
    .filter((x) => x.date > sleepFrom && x.date <= today && typeof x.sleep === 'number')
    .map((x) => x.sleep as number)
  if (sleeps.length >= 2) {
    const avg = sum(sleeps) / sleeps.length
    if (avg < 6.5) {
      out.push({
        id: 'sleep',
        level: 'warn',
        title: 'Sommeil insuffisant',
        body: "Sous 6 h 30 de moyenne, la récupération ne suit pas la charge. C'est le levier le plus rentable avant d'ajouter la moindre séance.",
        evidence: `${avg.toFixed(1)} h de moyenne sur ${sleeps.length} relevés`,
        target: 'recovery',
      })
    }
  }

  /* 5 — Fatigue ressentie sur le dernier relevé. */
  const recentWellness = state.wellness
    .filter((x) => x.date > addDays(today, -2) && x.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .pop()
  if (recentWellness && (recentWellness.fatigue ?? 0) >= 8) {
    out.push({
      id: 'fatigue',
      level: 'warn',
      title: 'Fatigue élevée',
      body: 'Garde la séance mais retire la dernière série de chaque exercice, ou remplace le footing par 25 min très souples.',
      evidence: `Fatigue ${recentWellness.fatigue}/10 le ${recentWellness.date}`,
      target: 'recovery',
    })
  }

  /* 6 — Vitesse de prise de poids. */
  const weights = [...state.weights]
    .filter((x) => x.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date))
  const recentWeights = weights.filter((x) => x.date > addDays(today, -28))
  const firstW = recentWeights[0]
  const lastW = recentWeights[recentWeights.length - 1]
  if (firstW && lastW && daysBetween(firstW.date, lastW.date) >= 7) {
    const weeks = daysBetween(firstW.date, lastW.date) / 7
    const rate = (lastW.kg - firstW.kg) / weeks
    if (rate > 0.25) {
      out.push({
        id: 'weight_rate',
        level: 'warn',
        title: 'Prise de poids trop rapide',
        body: "Au-delà de 0,25 kg par semaine, la part de gras augmente sans bénéfice sur la performance. Réduis l'excédent calorique, garde les protéines.",
        evidence: `+${rate.toFixed(2)} kg / semaine sur ${Math.round(weeks * 7)} jours`,
        target: 'body',
      })
    }
  }

  /* 7 — Saut de volume de course d'une semaine sur l'autre. */
  const kmBetween = (from: ISODate, to: ISODate): number =>
    sum(
      state.sessions
        .filter((x) => x.status === 'done' && x.kind === 'run' && x.date > from && x.date <= to)
        .map((x) => x.log?.km ?? 0),
    )
  const kmThis = kmBetween(addDays(today, -7), today)
  const kmPrev = kmBetween(addDays(today, -14), addDays(today, -7))
  if (kmPrev > 0 && kmThis > kmPrev * 1.3) {
    out.push({
      id: 'run_jump',
      level: 'warn',
      title: 'Volume de course en hausse de plus de 30 %',
      body: 'La règle du programme est +8 % par semaine. Les tendons et les os s\'adaptent plus lentement que le cardio.',
      evidence: `${kmThis.toFixed(1)} km cette semaine contre ${kmPrev.toFixed(1)} km la précédente`,
      target: 'perf',
    })
  }

  /* 8 — Stagnation de la distance nagee sans pause. */
  const swims = state.sessions
    .filter((x) => x.status === 'done' && x.kind === 'swim' && x.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date))
  const withCont = swims.filter((x) => typeof x.log?.continuous === 'number')
  if (withCont.length >= 3) {
    const best = Math.max(...withCont.map((x) => x.log?.continuous ?? 0))
    const bestDate = withCont.find((x) => (x.log?.continuous ?? 0) === best)?.date
    if (bestDate && daysBetween(bestDate, today) >= 21) {
      out.push({
        id: 'swim_stagnation',
        level: 'info',
        title: 'Distance continue à l\'arrêt',
        body: "Passer un palier est un problème de glisse et de respiration, pas de condition physique. Travaille le temps de glisse en brasse avant de chercher la distance.",
        evidence: `${best} m sans pause, inchangé depuis ${daysBetween(bestDate, today)} jours`,
        target: 'perf',
      })
    }
  }

  /* 9 — Repères de force jamais testés, ou connus seulement par un minimum. */
  const testable: BenchmarkKey[] = ['pullups', 'dips', 'muscleups', 'legraises', 'squats']
  const label = (k: BenchmarkKey): string => BENCHMARK_LABELS[k].toLowerCase()
  const untested = testable.filter((k) => benchmarkValue(state.benchmarks[k]) === null)
  // Un repère déclaré « j'en fais au moins X » reste un plancher : le vrai
  // maximum n'a jamais été mesuré, et le score le sous-estime tant qu'il l'est.
  const partial = testable.filter((k) => isPartial(state.benchmarks[k]))

  if (untested.length + partial.length > 0 && scores.missing > 0) {
    const pieces = [
      untested.length > 0 ? `Jamais testé : ${untested.map(label).join(', ')}.` : null,
      partial.length > 0
        ? `Minimum connu mais maximum jamais atteint : ${partial.map(label).join(', ')}.`
        : null,
      'Le protocole de test est intégré à la prochaine séance haut du corps.',
    ].filter(Boolean)

    out.push({
      id: 'benchmarks_missing',
      level: 'info',
      title: `${scores.missing} % du score est en attente de tests`,
      body: pieces.join(' '),
      evidence: `${untested.length} repère(s) sans mesure, ${partial.length} connu(s) par un plancher`,
      target: 'perf',
    })
  }

  /* 10 — Faisabilite du calendrier de course. */
  const race = state.profile.raceDate
  if (race) {
    const f = raceFeasibility(today, race)
    if (!f.sufficient) {
      out.push({
        id: 'race_feasibility',
        level: f.weeksAvailable < 0 ? 'info' : 'critical',
        title: f.weeksAvailable < 0 ? 'Date de course passée' : 'Calendrier trop court',
        body: f.message,
        evidence: `${f.weeksAvailable} semaines entre aujourd'hui et le ${race}`,
        target: 'goals',
      })
    }
  }

  return sortAlerts(out)
}

export function sortAlerts(alerts: Alert[]): Alert[] {
  return [...alerts].sort(
    (a, b) =>
      LEVEL_RANK[a.level] - LEVEL_RANK[b.level] ||
      ID_RANK.indexOf(a.id) - ID_RANK.indexOf(b.id),
  )
}

/** Signal le plus critique du jour, utilise pour l'ouverture proactive du coach. */
export function topAlert(alerts: Alert[]): Alert | null {
  return alerts[0] ?? null
}
