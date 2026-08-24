import { agg } from './aggregate'
import { addDays, weeksBetween } from './date'
import { clamp, pace, sum } from './math'
import { computeRecovery } from './recovery'
import { benchmarkValue, currentWeight, isPartial, swimBest, UNTESTED } from './state'
import type { AthleteState, ISODate, ScorePart, Scores, SubScore, SubScoreKey } from './types'

/**
 * MOTEUR DE SCORE
 *
 * Chaque sous-score est une somme de composantes pondérées. Une composante
 * non mesurée vaut null : elle est retirée du calcul et alimente `missing`,
 * la part du score qui n'est adossée à aucune donnée réelle.
 *
 * Aucune valeur par défaut ne vient combler un trou. Un repère jamais testé
 * s'affiche « A TESTER » et ne rapporte rien.
 */

/** Cibles à 12 mois. Elles definissent l'échelle de chaque composante. */
export const TARGETS = {
  /** Volume hebdomadaire de course vise pour un marathon sub 4 h. */
  runWeeklyKm: 55,
  /** Plus longue sortie visee. */
  runLongestKm: 32,
  /** Allure la plus lente prise en compte, en min/km. */
  paceFloor: 7,
  /** Allure qui vaut 100 sur la composante vitesse. */
  paceCeiling: 4.5,
  /** Distance nagee sans pause visee. */
  swimContinuousM: 1500,
  /** Séances de natation par quinzaine. */
  swimSessionsPerFortnight: 4,
  pullups: 20,
  dips: 30,
  squats: 80,
  muscleups: 8,
  legraises: 20,
  /** Répétitions à la barre sur 14 jours. */
  barVolume14d: 300,
  /** Minutes aérobies hebdomadaires. */
  aerobicMinutes: 300,
} as const

export const SUB_WEIGHTS: Record<SubScoreKey, number> = {
  running: 28,
  natation: 20,
  physique: 14,
  street: 12,
  force: 10,
  endurance: 10,
  recuperation: 6,
}

const META: Record<SubScoreKey, { label: string; icon: string; color: string }> = {
  running: { label: 'Running', icon: '🏃', color: '#E2603A' },
  natation: { label: 'Natation', icon: '🏊', color: '#2F97AE' },
  physique: { label: 'Physique', icon: '🧍', color: '#8A9BB0' },
  street: { label: 'Street', icon: '🤸', color: '#7C6BE3' },
  force: { label: 'Force', icon: '💪', color: '#B98A4E' },
  endurance: { label: 'Endurance', icon: '❤️', color: '#C05B6E' },
  recuperation: { label: 'Récup', icon: '🔋', color: '#5BBF7B' },
}

export function computeScores(state: AthleteState, today: ISODate): Scores {
  const from7 = addDays(today, -8)
  const from14 = addDays(today, -15)

  const done = state.sessions.filter((x) => x.status === 'done' && x.date <= today)
  const last7 = done.filter((x) => x.date > from7)
  const last14 = done.filter((x) => x.date > from14)
  const runs = done.filter((x) => x.kind === 'run' && x.log?.km)
  const swims = done.filter((x) => x.kind === 'swim')

  /* ── RUNNING — cible marathon sub 4 h (5:41/km) ── */
  const km7 = sum(last7.filter((x) => x.log?.km).map((x) => x.log?.km ?? 0))
  const longest = runs.length ? Math.max(...runs.map((x) => x.log?.km ?? 0)) : 0
  const paced = runs.filter((r) => (r.log?.km ?? 0) >= 3 && r.log?.minutes)
  const bestPace = paced.length
    ? Math.min(...paced.map((r) => (r.log?.minutes as number) / (r.log?.km as number)))
    : null

  const running = agg([
    {
      k: 'Volume hebdo',
      w: 35,
      v: clamp((km7 / TARGETS.runWeeklyKm) * 100),
      detail: `${km7.toFixed(1)} km / ${TARGETS.runWeeklyKm} km`,
    },
    {
      k: 'Sortie longue',
      w: 30,
      v: clamp((longest / TARGETS.runLongestKm) * 100),
      detail: `${longest.toFixed(1)} km / ${TARGETS.runLongestKm} km`,
    },
    {
      k: 'Vitesse',
      w: 35,
      v:
        bestPace === null
          ? null
          : clamp(((TARGETS.paceFloor - bestPace) / (TARGETS.paceFloor - TARGETS.paceCeiling)) * 100),
      detail: bestPace === null ? 'a mesurer' : `${pace(bestPace, 1)}/km`,
    },
  ])

  /* ── NATATION — cible 1 500 m continus ── */
  const { continuous: cont, crawl } = swimBest(state)
  const swimFreq = swims.filter((x) => x.date > from14).length
  const natation = agg([
    {
      k: 'Distance continue',
      w: 65,
      v:
        cont > 0
          ? clamp((Math.log(cont / 25) / Math.log(TARGETS.swimContinuousM / 25)) * 100)
          : null,
      detail: cont > 0 ? `${cont} m / 1 500 m` : 'a mesurer',
    },
    {
      k: 'Regularite',
      w: 20,
      v: clamp((swimFreq / TARGETS.swimSessionsPerFortnight) * 100),
      detail: `${swimFreq} séances / 14 j`,
    },
    {
      k: 'Crawl',
      w: 15,
      v: crawl ? 60 : 0,
      detail: crawl ? 'en cours' : 'non acquis',
    },
  ])

  /* ── FORCE — force relative, tous les repères viennent des tests ── */
  const b = state.benchmarks
  const detail = (key: keyof typeof b, target: number): string => {
    const v = benchmarkValue(b[key])
    if (v === null) return UNTESTED
    return `${v}${isPartial(b[key]) ? '+' : ''} / ${target}`
  }
  const ratio = (key: keyof typeof b, target: number): number | null => {
    const v = benchmarkValue(b[key])
    return v === null ? null : clamp((v / target) * 100)
  }

  const force = agg([
    { k: 'Tractions max', w: 40, v: ratio('pullups', TARGETS.pullups), detail: detail('pullups', TARGETS.pullups) },
    { k: 'Dips max', w: 35, v: ratio('dips', TARGETS.dips), detail: detail('dips', TARGETS.dips) },
    { k: 'Squats max', w: 25, v: ratio('squats', TARGETS.squats), detail: detail('squats', TARGETS.squats) },
  ])

  /* ── STREET — figures et gainage ── */
  const barReps = sum(last14.filter((x) => x.type === 'UPPER').map((x) => x.log?.reps ?? 0))
  const street = agg([
    {
      k: 'Muscle-up',
      w: 45,
      v: ratio('muscleups', TARGETS.muscleups),
      detail: detail('muscleups', TARGETS.muscleups),
    },
    {
      k: 'Relevés de jambes',
      w: 25,
      v: ratio('legraises', TARGETS.legraises),
      detail: detail('legraises', TARGETS.legraises),
    },
    {
      k: 'Volume barre',
      w: 30,
      v: clamp((barReps / TARGETS.barVolume14d) * 100),
      detail: `${barReps} reps / 14 j`,
    },
  ])

  /* ── PHYSIQUE ── */
  const cur = currentWeight(state)
  const gain = cur - state.profile.startWeight
  const target = state.profile.goalWeight - state.profile.startWeight
  const weeksIn = weeksBetween(state.profile.programStart, today)
  const rate = gain / weeksIn
  const height = state.profile.heightCm
  const bmi = height ? cur / Math.pow(height / 100, 2) : null

  const physiqueParts: ScorePart[] = [
    {
      k: 'Progression poids',
      w: 40,
      v: target === 0 ? (Math.abs(gain) <= 0.5 ? 100 : 0) : clamp((gain / target) * 100),
      detail: `${cur.toFixed(1)} kg → ${state.profile.goalWeight} kg`,
    },
    {
      k: 'Vitesse de prise',
      w: 25,
      v: state.weights.length < 2 ? null : rate <= 0.25 ? 100 : clamp(100 - (rate - 0.25) * 200),
      detail:
        state.weights.length < 2
          ? 'une seule pesée'
          : `${rate >= 0 ? '+' : ''}${rate.toFixed(2)} kg / semaine`,
    },
    {
      k: 'Suivi mensurations',
      w: 20,
      v: state.measures.length ? clamp(state.measures.length * 50) : 0,
      detail: `${state.measures.length} relevé(s)`,
    },
    {
      k: 'Composition',
      w: 15,
      v: bmi === null ? null : bmi >= 21 && bmi <= 25 ? 85 : 55,
      detail: bmi === null ? 'taille non renseignee' : `IMC ${bmi.toFixed(1)}`,
    },
  ]
  const physique = agg(physiqueParts)

  /* ── ENDURANCE — minutes aérobies et efficacite cardiaque ── */
  const aerobicMin = sum(
    last7.filter((x) => x.kind === 'run' || x.kind === 'swim').map((x) => x.log?.minutes ?? 0),
  )
  const hrRuns = runs.filter((r) => r.log?.hr && r.log?.minutes)
  const eff = hrRuns.length
    ? Math.min(
        ...hrRuns.map(
          (r) => ((r.log?.minutes as number) / (r.log?.km as number)) * ((r.log?.hr as number) / 150),
        ),
      )
    : null
  const endurance = agg([
    {
      k: 'Minutes aérobies',
      w: 60,
      v: clamp((aerobicMin / TARGETS.aerobicMinutes) * 100),
      detail: `${Math.round(aerobicMin)} min / ${TARGETS.aerobicMinutes} min`,
    },
    {
      k: 'Efficacite cardiaque',
      w: 40,
      v: eff === null ? null : clamp(((7.5 - eff) / 3) * 100),
      detail: eff === null ? 'FC non mesurée' : `indice ${eff.toFixed(2)}`,
    },
  ])

  const rec = computeRecovery(state, today)

  const subs = {
    running: withMeta('running', running),
    natation: withMeta('natation', natation),
    physique: withMeta('physique', physique),
    street: withMeta('street', street),
    force: withMeta('force', force),
    endurance: withMeta('endurance', endurance),
    recuperation: withMeta('recuperation', {
      // Non mesurée, la récupération sort du score global comme n'importe
      // quelle autre composante absente. Le 65 affiché ailleurs est un
      // remplissage d'écran, pas une note.
      score: rec.measured ? rec.score : null,
      coverage: rec.coverage,
      parts: rec.parts,
    }),
  } satisfies Record<SubScoreKey, SubScore>

  const list = Object.values(subs)
  const known = list.filter((x) => x.score !== null)
  const wKnown = sum(known.map((x) => x.weight))
  const global = wKnown
    ? Math.round(sum(known.map((x) => (x.score as number) * x.weight)) / wKnown)
    : 0

  // Couverture : part du score reposant sur une donnée réellement mesurée.
  const coverage = sum(list.map((x) => x.weight * (x.coverage ?? 0))) / 100
  const missing = Math.round((1 - coverage) * 100)

  return { subs, global, missing, coverage }
}

function withMeta(
  key: SubScoreKey,
  a: { score: number | null; coverage: number; parts: ScorePart[] },
): SubScore {
  return { ...a, ...META[key], weight: SUB_WEIGHTS[key] }
}

export const LEVELS = [
  { min: 0, n: 1, t: 'Beginner Athlete' },
  { min: 30, n: 2, t: 'Developing Athlete' },
  { min: 50, n: 3, t: 'Hybrid Athlete' },
  { min: 70, n: 4, t: 'Advanced Athlete' },
  { min: 85, n: 5, t: 'Elite Hybrid' },
] as const

export function levelOf(global: number): (typeof LEVELS)[number] {
  return [...LEVELS].reverse().find((l) => global >= l.min) ?? LEVELS[0]
}

export interface MarathonReadiness {
  pct: number
  km7: number
  longest: number
  bestPace: number | null
}

/** Préparation marathon en %, pondérée volume 40 / sortie longue 35 / vitesse 25. */
export function marathonReadiness(state: AthleteState, today: ISODate): MarathonReadiness {
  const runs = state.sessions.filter(
    (x) => x.status === 'done' && x.kind === 'run' && x.log?.km && x.date <= today,
  )
  const from7 = addDays(today, -8)
  const km7 = sum(runs.filter((x) => x.date > from7).map((x) => x.log?.km ?? 0))
  const longest = runs.length ? Math.max(...runs.map((x) => x.log?.km ?? 0)) : 0
  const paced = runs.filter((r) => (r.log?.km ?? 0) >= 4 && r.log?.minutes)
  const bestPace = paced.length
    ? Math.min(...paced.map((r) => (r.log?.minutes as number) / (r.log?.km as number)))
    : null
  const pct =
    clamp((km7 / TARGETS.runWeeklyKm) * 100) * 0.4 +
    clamp((longest / TARGETS.runLongestKm) * 100) * 0.35 +
    (bestPace === null ? 0 : clamp(((7 - bestPace) / (7 - 5.0)) * 100) * 0.25)
  return { pct: Math.round(pct), km7, longest, bestPace }
}
