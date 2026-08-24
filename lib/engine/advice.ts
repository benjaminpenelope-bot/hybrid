import { addDays, DAYS_FR_LONG } from './date'
import { clamp, sum } from './math'
import { runStats } from './perf'
import { PHASE_TARGETS } from './marathon'
import { consecutiveDays } from './load'
import type { AthleteState, ISODate, Session } from './types'

/**
 * CONSEILS CALCULÉS
 *
 * Le prototype écrivait ces paragraphes à la main. Ils étaient justes le jour
 * de la capture d'écran, faux la semaine suivante. Ici tout se déduit des
 * données, et un conseil dont la donnée manque ne s'affiche pas.
 */

/* ── Natation ─────────────────────────────────────────────── */

export const SWIM_RUNGS = [25, 50, 100, 200, 300, 500, 750, 1000, 1500] as const

export function nextRung(continuous: number): number {
  return SWIM_RUNGS.find((r) => r > continuous) ?? 1500
}

/**
 * Ce qui limite réellement au palier atteint. Passer de 25 à 100 m est un
 * problème technique ; passer de 750 à 1 500 m est un problème d'allure.
 */
export function swimTechniqueAdvice(continuous: number): string {
  const next = nextRung(continuous)
  if (continuous < 100)
    return `Le passage de ${continuous} à ${next} m est presque uniquement technique : glisse en brasse et respiration continue. Ne cherche pas à forcer la distance avant que 4 × 50 m ne passent sans essoufflement.`
  if (continuous < 300)
    return `À ${continuous} m, ce qui bloque est respiratoire avant d'être musculaire. Travaille par séries de ${Math.round(continuous / 2)} m avec 30 s de repos, jusqu'à les enchaîner sans accélérer le souffle.`
  if (continuous < 750)
    return `À ${continuous} m, la distance est acquise : c'est la régularité d'allure qui décide. Nage ${next} m en te forçant à ralentir sur la première moitié.`
  return `À ${continuous} m, tu es en endurance pure. Allonge de 100 à 200 m par séance, sans jamais chercher la vitesse.`
}

export interface Blocker {
  title: string
  text: string
}

/**
 * Le point de blocage numéro un en natation. Un seul, celui qui empêche de
 * mesurer quoi que ce soit — pas une liste de recommandations.
 */
export function swimBlocker(state: AthleteState, today: ISODate): Blocker | null {
  const swims = state.sessions.filter(
    (s) => s.status === 'done' && s.kind === 'swim' && s.date <= today,
  )
  if (swims.length === 0) {
    return {
      title: 'Aucune séance enregistrée',
      text: "Enregistre ta prochaine séance de piscine avec la distance nagée : sans elle, ni ton score natation ni ta progression n'existent.",
    }
  }

  const withDistance = swims.filter((s) => s.log?.distance)
  const minutes = sum(swims.map((s) => s.log?.minutes ?? 0))

  if (withDistance.length === 0) {
    return {
      title: 'Tu ne comptes pas ta distance',
      text: `Tu passes ${Math.round(minutes)} min dans l'eau sur ${swims.length} séance${swims.length > 1 ? 's' : ''} sans noter de distance : impossible de mesurer une progression. À partir de la prochaine séance, compte tes longueurs. C'est la donnée la plus importante des trois prochains mois.`,
    }
  }

  const withContinuous = swims.filter((s) => typeof s.log?.continuous === 'number')
  if (withContinuous.length === 0) {
    return {
      title: 'La distance continue manque',
      text: "Tu notes ton total mais pas la plus longue distance enchaînée sans pause. C'est pourtant elle qui décide de ton score et de ton objectif à 1 500 m.",
    }
  }

  const crawl = swims.some((s) => s.log?.crawl === true)
  const best = Math.max(...withContinuous.map((s) => s.log?.continuous ?? 0))
  if (!crawl && best >= 200) {
    return {
      title: 'Le crawl reste à acquérir',
      text: `Tu tiens ${best} m en brasse. Au-delà, la brasse coûte plus cher que le crawl en énergie. Consacre 10 min d'éducatifs par séance au crawl avant de chercher plus de distance.`,
    }
  }

  return null
}

/* ── Bilan ────────────────────────────────────────────────── */

export interface Insight {
  title: string
  text: string
  warn?: boolean
}

/** Ce qui progresse, déduit de l'assiduité et de l'alternance des disciplines. */
export function whatProgresses(state: AthleteState, today: ISODate): Insight | null {
  const week = state.sessions.filter(
    (s) => s.status === 'done' && s.date > addDays(today, -8) && s.date <= today,
  )
  if (week.length === 0) return null

  const streak = consecutiveDays(state, today)
  const kinds = new Set(week.map((s) => s.kind))

  if (streak >= 4 && kinds.size >= 3) {
    return {
      title: 'La régularité.',
      text: `${streak} jours d'activité consécutifs, avec une alternance ${[...kinds]
        .map((k) => ({ run: 'course', swim: 'piscine', strength: 'barre', rest: 'repos' })[k])
        .join(' / ')} déjà cohérente. C'est la base qui manque à la plupart des gens et tu l'as déjà.`,
    }
  }
  if (kinds.size >= 3) {
    return {
      title: "L'équilibre entre disciplines.",
      text: `${week.length} séances sur la semaine, réparties sur ${kinds.size} disciplines. L'hybride tient, il reste à en augmenter le volume.`,
    }
  }
  return {
    title: 'Les séances enregistrées.',
    text: `${week.length} séance${week.length > 1 ? 's' : ''} sur les 7 derniers jours. Chaque séance validée rend le score un peu moins partiel.`,
  }
}

/** Ce qui doit progresser : les écarts réels, chiffrés, du plus urgent au moins. */
export function whatMustProgress(
  state: AthleteState,
  today: ISODate,
  missingPct: number,
): Insight[] {
  const out: Insight[] = []
  const stats = runStats(state, today)
  const target = PHASE_TARGETS.SPECIFIC.weeklyKm

  if (stats.km7 < target) {
    out.push({
      title: 'Le volume de course.',
      text: `${stats.km7.toFixed(1)} km sur la semaine, il en faudra ${PHASE_TARGETS.BUILD.weeklyKm} à ${target} pour un marathon sous 4 h. C'est le chantier numéro un des prochains mois.`,
    })
  }

  const swims = state.sessions.filter(
    (s) => s.status === 'done' && s.kind === 'swim' && s.date > addDays(today, -8),
  )
  const unmeasured = swims.filter((s) => !s.log?.distance)
  if (unmeasured.length > 0) {
    out.push({
      title: 'Les données de natation.',
      text: `${unmeasured.length} séance${unmeasured.length > 1 ? 's' : ''} sans distance notée : impossible de piloter la progression.`,
    })
  }

  if (missingPct > 0) {
    out.push({
      title: 'Tes repères de force.',
      text: `${missingPct} % du score attend une mesure réelle plutôt qu'une valeur déclarée ou absente.`,
    })
  }

  return out
}

/**
 * Ce que le programme prévoit la semaine prochaine, lu sur les séances
 * réellement générées — pas une description écrite d'avance.
 */
export function nextWeekPlan(
  state: AthleteState,
  today: ISODate,
): { text: string; vigilance: string | null } {
  const from = today
  const to = addDays(today, 7)
  const next = state.sessions.filter((s) => s.date > from && s.date <= to)

  const byType = (t: Session['type']) => next.filter((s) => s.type === t)
  const runs = [...byType('RUN'), ...byType('LONG')]
  const swims = byType('SWIM')
  const strength = [...byType('UPPER'), ...byType('LOWER')]
  const restDay = next.find((s) => s.type === 'REST')
  const plannedKm = sum(
    runs.map((s) => {
      const match = s.title.match(/([\d.,]+)\s*km/)
      return match ? Number(match[1]?.replace(',', '.')) : 0
    }),
  )

  const finisher = runs.find((s) => s.finisher)
  const parts = [
    restDay ? `Un vrai jour de repos le ${DAYS_FR_LONG[new Date(`${restDay.date}T12:00:00`).getDay()]?.toLowerCase()}.` : null,
    runs.length > 0
      ? `Course portée à ${plannedKm.toFixed(1)} km sur ${runs.length} sortie${runs.length > 1 ? 's' : ''}, toutes en endurance fondamentale.`
      : null,
    swims.length > 0
      ? `${swims.length} séance${swims.length > 1 ? 's' : ''} de natation, avec distance comptée.`
      : null,
    strength.length > 0 ? `${strength.length} séance${strength.length > 1 ? 's' : ''} de force.` : null,
    finisher ? `Le renforcement des jambes reste un bloc de ${finisher.finisher?.duration} min enchaîné au footing.` : null,
    'Aucune séance à haute intensité : à ce stade, la fatigue coûterait plus qu’elle ne rapporterait.',
  ].filter((p): p is string => p !== null)

  const currentKm = runStats(state, today).km7
  const jump = currentKm > 0 ? Math.round((plannedKm / currentKm - 1) * 100) : null

  return {
    text: parts.join(' '),
    vigilance:
      jump !== null && jump > 30
        ? `+${jump} % de volume de course d'une semaine sur l'autre. C'est acceptable depuis une base aussi basse, mais si un footing dépasse RPE 6 ou si un tendon se manifeste, on plafonne la semaine suivante au lieu de monter.`
        : null,
  }
}

/**
 * Score de la semaine : assiduité 60 %, volume atteint 40 %.
 * Différent du score global, qui juge le niveau — celui-ci juge la semaine.
 */
export function weekScore(state: AthleteState, today: ISODate): number {
  const week = state.sessions.filter((s) => s.date > addDays(today, -8) && s.date <= today)
  const planned = week.filter((s) => s.type !== 'REST').length
  const done = week.filter((s) => s.status === 'done').length
  const targetKm = state.profile.baseWeeklyKm ?? 15
  const km = sum(week.filter((s) => s.status === 'done').map((s) => s.log?.km ?? 0))
  return Math.round(
    (planned > 0 ? (done / planned) * 60 : 0) + clamp((km / targetKm) * 100) * 0.4,
  )
}
