import { agg } from './aggregate'
import { acuteChronic, consecutiveDays } from './load'
import { clamp } from './math'
import { lastWellness } from './state'
import type { AthleteState, ISODate, Recovery, RecoveryZone, ScorePart } from './types'

/**
 * SCORE DE RECUPERATION — 0 à 100.
 * Sommeil et fatigue viennent du relevé quotidien, la charge des séances
 * enregistrées. Sans relevé, le score repose sur la charge seule et la
 * couverture le signale.
 */

export const ZONES: Record<RecoveryZone, { label: string; advice: string }> = {
  GREEN: {
    label: 'Entraînement normal',
    advice: 'Rien ne bloque. Applique la séance prévue telle quelle.',
  },
  YELLOW: {
    label: "Baisse l'intensité",
    advice: 'Garde la séance mais retire une série, ou ralentis de 20 s/km.',
  },
  RED: {
    label: 'Récupération prioritaire',
    advice: "Repos ou marche. Reprendre à l'identique aggraverait la dette.",
  },
  UNKNOWN: {
    label: 'Non mesurée',
    advice:
      "Aucune donnée pour l'instant. Renseigne ton sommeil et ta fatigue du jour, ou enregistre une séance, et ce score voudra dire quelque chose.",
  },
}

/**
 * Score affiché quand aucune composante n'est mesurable : neutre, jamais
 * flatteur. Il ne sert qu'à remplir la case — la zone vaut UNKNOWN et aucun
 * conseil n'en est tiré.
 */
export const NEUTRAL_RECOVERY = 65

export function zoneOf(score: number): Exclude<RecoveryZone, 'UNKNOWN'> {
  return score >= 70 ? 'GREEN' : score >= 45 ? 'YELLOW' : 'RED'
}

export function computeRecovery(state: AthleteState, today: ISODate): Recovery {
  const { l7, l28, acwr } = acuteChronic(state, today)
  const w = lastWellness(state, today)
  const streak = consecutiveDays(state, today)
  // Sans aucune séance enregistrée, ni le ratio de charge ni les jours
  // consécutifs ne mesurent quoi que ce soit : ils sortent du calcul.
  const hasHistory = state.sessions.some((x) => x.status === 'done' && x.date <= today)

  const sleep = w?.sleep ?? null
  const fatigue = w?.fatigue ?? null

  const parts: ScorePart[] = [
    {
      k: 'Sommeil',
      w: 30,
      v: sleep === null ? null : clamp(((sleep - 5) / 3.5) * 100),
      detail: sleep === null ? 'a renseigner' : `${sleep} h`,
    },
    {
      k: 'Fatigue ressentie',
      w: 30,
      v: fatigue === null ? null : clamp((1 - (fatigue - 1) / 9) * 100),
      detail: fatigue === null ? 'a renseigner' : `${fatigue}/10`,
    },
    {
      k: 'Ratio de charge',
      w: 20,
      v:
        l28 > 0
          ? clamp(acwr <= 1.3 ? 100 - Math.abs(acwr - 1) * 60 : 100 - (acwr - 1.3) * 120 - 18)
          : null,
      detail: l28 > 0 ? `A:C ${acwr.toFixed(2)}` : 'aucune charge enregistrée',
    },
    {
      k: 'Jours consécutifs',
      w: 20,
      v: hasHistory ? clamp(100 - Math.max(0, streak - 3) * 25) : null,
      detail: hasHistory ? `${streak} j sans coupure` : 'aucune séance enregistrée',
    },
  ]

  const a = agg(parts)
  const measured = a.score !== null
  // Sans la moindre composante mesurée, on n'a pas de score de récupération :
  // on a une case vide. En tirer « baisse l'intensité » serait un conseil
  // fabriqué à partir de rien.
  const score = measured ? (a.score as number) : NEUTRAL_RECOVERY
  return {
    ...a,
    score,
    measured,
    zone: measured ? zoneOf(score) : 'UNKNOWN',
    acwr,
    l7,
    l28,
    streak,
    soreness: w?.soreness || null,
  }
}
