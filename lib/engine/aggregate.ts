import { clamp, sum } from './math'
import type { Aggregate, ScorePart } from './types'

/**
 * Agrégation pondérée d'un sous-score.
 * Une composante non mesurée vaut null : elle sort de la moyenne et réduit la
 * couverture. Le score n'est jamais complète par une valeur par défaut.
 */
export function agg(parts: ScorePart[]): Aggregate {
  const known = parts.filter((p) => p.v !== null && p.v !== undefined)
  const wTot = sum(parts.map((p) => p.w))
  const wKnown = sum(known.map((p) => p.w))
  if (!wKnown) return { score: null, coverage: 0, parts }
  const raw = sum(known.map((p) => (p.v as number) * p.w)) / wKnown
  return { score: Math.round(clamp(raw)), coverage: wTot ? wKnown / wTot : 0, parts }
}
