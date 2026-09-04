import { computeAlerts, type Alert } from '@/lib/engine/alerts'
import { addDays } from '@/lib/engine/date'
import { decide } from '@/lib/engine/decide'
import { limitationsActives, LIBELLE_OBJECTIF, objectifsActifs } from '@/lib/engine/goals'
import { weightTrend } from '@/lib/engine/body'
import { acuteChronic } from '@/lib/engine/load'
import { runStats, swimStats } from '@/lib/engine/perf'
import { computeRecovery } from '@/lib/engine/recovery'
import { computeScores } from '@/lib/engine/scoring'
import { benchmarkValue, isPartial, UNTESTED } from '@/lib/engine/state'
import type { AthleteState, ISODate } from '@/lib/engine/types'

/**
 * CONTEXTE DU COACH
 *
 * Tout ce que le coach a le droit de savoir, et rien d'autre. Un repère non
 * mesuré part en « À TESTER » plutôt qu'en zéro : le modèle ne doit jamais
 * pouvoir confondre une absence de mesure avec une contre-performance.
 */

/** Pesées transmises : de quoi voir une tendance sans noyer le contexte. */
const FENETRE_PESEES = 12

export interface CoachContext {
  profil: Record<string, unknown>
  score_global: number
  part_du_score_non_mesuree: string
  sous_scores: Record<string, number | null>
  recuperation: Record<string, unknown>
  signaux: { niveau: string; titre: string; preuve: string }[]
  reperes_force: Record<string, string>
  natation: Record<string, unknown>
  course: Record<string, unknown>
  /**
   * Le suivi du corps : pesees, tendance, mensurations.
   *
   * Il manquait entierement. Le coach ne recevait que le poids de depart et
   * le poids vise, tous deux figes au questionnaire — il ne pouvait donc ni
   * lire une pesee recente, ni voir une tendance, et repondait « je n'ai pas
   * ces donnees » a quelqu'un qui les avait saisies la veille.
   */
  corps: Record<string, unknown>
  /** Records personnels enregistres. Absents eux aussi jusqu'ici. */
  records: { repere: string; valeur: string; date: string }[]
  seances_recentes: Record<string, unknown>[]
  seances_a_venir: Record<string, unknown>[]
  /** Ce que l'athlete a declare viser. Le coach ne le remplace jamais. */
  objectifs: { objectif: string; priorite: string; echeance: string }[]
  /** Contraintes en cours a la date du jour. */
  limitations: { zone: string; description: string; depuis: string }[]
  /**
   * Ce que la couche de decision a conclu aujourd'hui, avec ses preuves.
   * Sans ca, le coach raisonnait a cote de l'ecran d'accueil et pouvait le
   * contredire — deux verdicts differents sur la meme journee.
   */
  verdict_du_jour: Record<string, unknown>
}

export function buildCoachContext(state: AthleteState, today: ISODate): CoachContext {
  const scores = computeScores(state, today)
  const recovery = computeRecovery(state, today)
  const alerts = computeAlerts(state, today, { scores })
  const load = acuteChronic(state, today)
  const run = runStats(state, today)
  const swim = swimStats(state, today)
  const poids = weightTrend(state, today)

  /*
   * Les pesees brutes des huit dernieres semaines, et non la moyenne
   * hebdomadaire seule : quelqu'un qui demande « combien je faisais lundi »
   * attend sa pesee de lundi, pas la moyenne de sa semaine.
   */
  const peseesRecentes = [...state.weights]
    .filter((w) => w.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-FENETRE_PESEES)
    .map((w) => ({ date: w.date, kg: w.kg }))

  const derniereMesure = [...state.measures]
    .filter((m) => m.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1)

  const verdict = decide(state, today)
  const done = state.sessions
    .filter((s) => s.status === 'done' && s.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-8)

  const next = state.sessions
    .filter((s) => s.date >= today && s.status === 'planned')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4)

  const benchmark = (key: 'pullups' | 'dips' | 'muscleups' | 'legraises' | 'squats'): string => {
    const value = benchmarkValue(state.benchmarks[key])
    if (value === null) return UNTESTED
    return isPartial(state.benchmarks[key])
      ? `au moins ${value}, maximum non testé`
      : `${value}, testé`
  }

  return {
    profil: {
      prenom: state.profile.name,
      sexe: state.profile.sex ?? 'non précisé',
      jour_de_repos: state.profile.restWeekday,
      doubles_autorises: state.profile.allowDoubles,
      date_de_course: state.profile.raceDate ?? 'non renseignée',
      volume_course_semaine_1_km: state.profile.baseWeeklyKm,
    },
    score_global: scores.global,
    part_du_score_non_mesuree: `${scores.missing} %`,
    sous_scores: Object.fromEntries(
      Object.entries(scores.subs).map(([key, sub]) => [key, sub.score]),
    ),
    recuperation: {
      score: recovery.measured ? recovery.score : 'non mesurée',
      zone: recovery.zone,
      charge_7j: recovery.l7,
      ratio_aigu_chronique: Number(load.acwr.toFixed(2)),
      ratio_fiable: load.reliable,
      jours_consecutifs: recovery.streak,
      douleur: recovery.soreness ?? 'aucune signalée',
    },
    signaux: alerts.map((a: Alert) => ({
      niveau: a.level,
      titre: a.title,
      preuve: a.evidence,
    })),
    reperes_force: {
      tractions: benchmark('pullups'),
      dips: benchmark('dips'),
      muscle_ups: benchmark('muscleups'),
      releves_de_jambes: benchmark('legraises'),
      squats: benchmark('squats'),
    },
    natation: {
      distance_continue_m: swim.continuous ?? UNTESTED,
      seances_enregistrees: swim.sessions,
      crawl_acquis: swim.crawl,
    },
    course: {
      km_7_jours: Number(run.km7.toFixed(1)),
      km_30_jours: Number(run.km30.toFixed(1)),
      plus_longue_sortie_km: run.longest ?? UNTESTED,
      meilleure_allure_min_par_km: run.bestPace === null ? UNTESTED : Number(run.bestPace.toFixed(2)),
      fc_moyenne: run.avgHr ?? 'non mesurée',
    },
    corps: {
      poids_actuel_kg: state.weights.length > 0 ? poids.current : 'aucune pesée',
      poids_depart_kg: state.profile.startWeight,
      poids_objectif_kg: state.profile.goalWeight,
      taille_cm: state.profile.heightCm,
      variation_depuis_le_depart_kg: Number(poids.gain.toFixed(1)),
      reste_a_parcourir_kg: Number((poids.target - poids.gain).toFixed(1)),
      /*
       * `rate` est nul tant que deux pesees ne sont pas espacees d'une
       * semaine : le dire en toutes lettres evite que le modele lise un zero
       * comme un poids stable.
       */
      vitesse_kg_par_semaine:
        poids.rate === null ? 'pas assez de pesées pour le dire' : Number(poids.rate.toFixed(2)),
      trop_rapide: poids.tooFast,
      pesees_recentes: peseesRecentes,
      moyennes_hebdomadaires: poids.weekly.slice(-8),
      dernieres_mensurations_cm: derniereMesure ?? 'aucune mesure',
    },
    records: state.records
      .slice(-10)
      .map((r) => ({ repere: r.label, valeur: r.value, date: r.date })),
    objectifs: objectifsActifs(state).map((g) => ({
      objectif: LIBELLE_OBJECTIF[g.type],
      priorite: g.priority,
      echeance: g.targetDate ?? 'sans date',
    })),
    limitations: limitationsActives(state, today).map((l) => ({
      zone: l.zone,
      description: l.description ?? '',
      depuis: l.startedOn,
    })),
    verdict_du_jour: {
      action: verdict.action,
      ampleur: verdict.ampleur ?? 'sans objet',
      seance_visee: verdict.sessionId ?? 'aucune',
      confirmation_requise: verdict.confirmationRequise,
      preuves: verdict.preuves.map((p) => ({ quoi: p.quoi, valeur: p.valeur, effet: p.effet })),
    },
    seances_recentes: done.map((s) => ({
      date: s.date,
      type: s.type,
      titre: s.title,
      log: s.log ?? 'aucun détail enregistré',
      rpe: s.rpe ?? (s.rpeEst ? `${s.rpeEst} (estimé)` : 'non saisi'),
      douleur: s.pain ?? null,
    })),
    seances_a_venir: next.map((s) => ({
      id: s.id,
      date: s.date,
      type: s.type,
      titre: s.title,
      objectif: s.target ?? s.goal ?? null,
      duree_min: s.duration,
      allegee: s.adapted ?? null,
    })),
  }
}

/** Fenêtre de contexte transmise au coach : 8 séances passées, 4 à venir. */
export const CONTEXT_WINDOW = { past: 8, upcoming: 4 } as const

/** Suggestions calculées : elles suivent l'état réel plutôt qu'une liste figée. */
export function quickPrompts(state: AthleteState, today: ISODate): string[] {
  const prompts: string[] = []
  const alerts = computeAlerts(state, today)
  const swim = swimStats(state, today)
  const todaySession = state.sessions.find((s) => s.date === today && s.status === 'planned')

  if (alerts.some((a) => a.id === 'pain')) prompts.push("J'ai encore mal, je fais quoi ?")
  if (alerts.some((a) => a.id === 'acwr' && a.level === 'critical'))
    prompts.push('Ma charge monte trop vite ?')
  if (alerts.some((a) => a.id === 'benchmarks_missing'))
    prompts.push('Comment je teste mes tractions ?')
  if (swim.continuous === null || swim.sessions === 0)
    prompts.push('Comment je compte mes longueurs ?')
  if (todaySession && todaySession.type !== 'REST')
    prompts.push("Je n'ai que 30 minutes aujourd'hui")

  prompts.push('Je suis fatigué aujourd’hui')
  prompts.push('Mon objectif marathon est-il réaliste ?')

  return [...new Set(prompts)].slice(0, 4)
}

/** Date de la veille, utilisée par le repli local. */
export const yesterday = (today: ISODate): ISODate => addDays(today, -1)
