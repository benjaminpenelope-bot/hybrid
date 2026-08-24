import { pace } from './math'
import { runStats } from './perf'
import type { PhaseKey } from './program'
import type { AthleteState, ISODate, Profile } from './types'

/**
 * VERDICT MARATHON
 *
 * Le prototype affichait ici un texte écrit à la main pour un athlète, à un
 * instant donné : « il te manque le volume, pas la vitesse », « passer de 10 à
 * 45 km ». Juste ce jour-là, faux le mois suivant.
 *
 * Tout est donc recalculé : le constat, les cibles de la phase en cours,
 * l'allure cible et l'arbitrage entre prise de poids et chrono. La forme du
 * prototype est conservée, le fond suit les données.
 */

export const MARATHON_KM = 42.195
/** Cible par défaut : marathon sous 4 h. */
export const DEFAULT_TARGET_MINUTES = 240

export interface PhaseTarget {
  weeklyKm: number
  longestKm: number
}

/** Ce qu'il faut tenir pour sortir de chaque phase. */
export const PHASE_TARGETS: Record<PhaseKey, PhaseTarget> = {
  BASE: { weeklyKm: 40, longestKm: 18 },
  BUILD: { weeklyKm: 55, longestKm: 26 },
  SPECIFIC: { weeklyKm: 65, longestKm: 32 },
  TAPER: { weeklyKm: 35, longestKm: 16 },
  RACE: { weeklyKm: 0, longestKm: MARATHON_KM },
}

/** Allure nécessaire pour boucler le marathon dans le temps visé, en min/km. */
export function targetPace(targetMinutes = DEFAULT_TARGET_MINUTES): number {
  return targetMinutes / MARATHON_KM
}

export function targetPaceLabel(targetMinutes = DEFAULT_TARGET_MINUTES): string {
  return pace(targetPace(targetMinutes), 1)
}

export type Gap = 'volume' | 'vitesse' | 'les deux' | 'inconnu'

export interface MarathonVerdict {
  ready: boolean
  headline: string
  detail: string
  /** Ce qui manque le plus. `inconnu` tant que la vitesse n'a pas été mesurée. */
  gap: Gap
}

/**
 * Constat du jour, calculé.
 * Tant que l'allure n'a jamais été mesurée sur une distance suffisante, on
 * refuse de dire ce qui manque : on dit qu'on ne sait pas encore.
 */
export function marathonVerdict(
  state: AthleteState,
  today: ISODate,
  phase: PhaseKey,
  targetMinutes = DEFAULT_TARGET_MINUTES,
): MarathonVerdict {
  const stats = runStats(state, today)
  const target = PHASE_TARGETS[phase]
  const goalPace = targetPace(targetMinutes)

  const km7 = stats.km7
  const longest = stats.longest ?? 0
  const paceKnown = stats.bestPace !== null
  const paceOk = paceKnown && (stats.bestPace as number) <= goalPace

  // L'écart se mesure par rapport au marathon, pas à la phase en cours :
  // c'est la question à laquelle l'athlète veut une réponse.
  const marathonVolume = PHASE_TARGETS.SPECIFIC
  const volumeOk = km7 >= marathonVolume.weeklyKm && longest >= marathonVolume.longestKm
  const ready = volumeOk && paceOk

  const gap: Gap = !paceKnown
    ? 'inconnu'
    : volumeOk && paceOk
      ? 'volume'
      : paceOk
        ? 'volume'
        : volumeOk
          ? 'vitesse'
          : 'les deux'

  const headline = ready
    ? 'Tu tiens les repères de volume et d’allure pour viser ce chrono.'
    : "Tu n'es pas en état de courir un marathon aujourd'hui."

  const measured = `Avec ${km7.toFixed(1)} km sur les 7 derniers jours et ${
    longest > 0 ? `${longest.toFixed(1)} km de plus longue sortie` : 'aucune sortie longue enregistrée'
  }`

  const missing =
    gap === 'inconnu'
      ? ", ton allure n'a pas encore été mesurée sur une sortie d'au moins 3 km : impossible de dire ce qui manque"
      : gap === 'volume'
        ? ', il te manque le volume, pas la vitesse'
        : gap === 'vitesse'
          ? `, il te manque la vitesse : ${pace(stats.bestPace as number, 1)}/km contre ${pace(goalPace, 1)}/km visés`
          : ', il te manque le volume et la vitesse'

  const next = `L'objectif de la phase en cours : atteindre ${target.weeklyKm} km par semaine et ${target.longestKm} km de sortie longue avant de parler d'allure spécifique.`

  return {
    ready,
    headline,
    detail: `${measured}${missing}. ${next}`,
    gap,
  }
}

export interface CalendarAssessment {
  paragraphs: { emphasis: string; text: string; warn?: boolean }[]
}

/**
 * Évaluation du calendrier, avec l'arbitrage que personne n'aime poser :
 * prendre du poids et courir vite se contredisent partiellement.
 */
export function calendarAssessment(
  state: AthleteState,
  today: ISODate,
  profile: Profile,
  weeksAvailable: number | null,
  targetMinutes = DEFAULT_TARGET_MINUTES,
): CalendarAssessment {
  const stats = runStats(state, today)
  const goalPace = targetPace(targetMinutes)
  const paragraphs: CalendarAssessment['paragraphs'] = []

  /* ── Vitesse contre tolérance au volume ── */
  const targetWeekly = PHASE_TARGETS.SPECIFIC.weeklyKm
  const monthsToVolume = Math.max(
    1,
    Math.ceil(Math.log(targetWeekly / Math.max(stats.km7, 5)) / Math.log(1.08) / 4.33),
  )

  if (stats.bestPace === null) {
    paragraphs.push({
      emphasis: 'Impossible de trancher sans allure mesurée.',
      text: `Cours une sortie d'au moins 5 km en enregistrant le temps : tant que ta vitesse n'est pas connue, personne ne peut dire si ${pace(goalPace, 1)}/km sur 42 km est réaliste pour toi.`,
    })
  } else {
    const fastEnough = stats.bestPace <= goalPace
    paragraphs.push({
      emphasis: fastEnough
        ? "Ta vitesse n'est pas le problème."
        : "Ta vitesse est aujourd'hui en dessous de la cible.",
      text: fastEnough
        ? `${pace(stats.bestPace, 1)}/km sur ${(stats.longest ?? 0).toFixed(1)} km montre que le moteur existe. Le problème est la tolérance au volume : passer de ${stats.km7.toFixed(0)} à ${targetWeekly} km par semaine demande environ ${monthsToVolume} mois de montée prudente, et c'est la période où la majorité des blessures arrivent.`
        : `${pace(stats.bestPace, 1)}/km contre ${pace(goalPace, 1)}/km visés. L'écart se comble par le volume avant l'intensité : monter à ${targetWeekly} km par semaine fait descendre l'allure d'endurance toute seule.`,
    })
  }

  /* ── Prise de poids contre chrono ── */
  const gain = profile.goalWeight - profile.startWeight
  if (gain > 0 && profile.startWeight > 0) {
    const pct = (gain / profile.startWeight) * 100
    const half = Math.round((gain / 2) * 10) / 10
    paragraphs.push({
      warn: true,
      emphasis: `Conflit à trancher : les ${gain.toFixed(gain % 1 === 0 ? 0 : 1)} kg.`,
      text: `Prendre ${gain.toFixed(gain % 1 === 0 ? 0 : 1)} kg, c'est +${pct.toFixed(0)} % de masse à transporter sur 42 km. À vitesse égale, ça coûte plusieurs minutes sur le chrono final. Les deux objectifs se contredisent partiellement.`,
    })
    paragraphs.push({
      emphasis: 'Recommandation :',
      text: `+${half.toFixed(1)} kg pendant la phase de base, quand le volume reste modéré, puis stabilisation du poids sur la préparation spécifique. Le reste après le marathon. Si tu tiens absolument à ${profile.goalWeight} kg avant la course, vise un chrono plus lent et assume-le.`,
    })
  }

  /* ── Temps disponible ── */
  if (weeksAvailable !== null) {
    paragraphs.push({
      emphasis: `${weeksAvailable} semaines avant la course.`,
      text:
        weeksAvailable < 19
          ? "C'est trop court pour dérouler une phase spécifique complète plus l'affûtage. Repousse la date, ou revois le chrono visé."
          : "Le calendrier permet une préparation complète, à condition de ne pas sauter la montée progressive du volume.",
      warn: weeksAvailable < 19,
    })
  }

  return { paragraphs }
}
