import type { StrengthBenchmarkKey } from '@/lib/engine/types'

/**
 * Forme et libellés du catalogue d'exercices.
 *
 * Séparé de la requête : ce fichier est importé par des composants client, et
 * `lib/db/exercises.ts` tire `next/headers`, qui n'existe pas côté navigateur.
 */

export interface ExerciseRef {
  key: string
  name: string
  zone: 'haut' | 'bas' | 'gainage'
  unit: 'reps' | 's'
  /** Repère correspondant. Sa présence ne fait pas d'une série un test. */
  benchmarkKey: StrengthBenchmarkKey | null
}

const ZONES: Record<ExerciseRef['zone'], string> = {
  haut: 'Haut du corps',
  bas: 'Bas du corps',
  gainage: 'Gainage',
}

export function zoneLabel(zone: ExerciseRef['zone']): string {
  return ZONES[zone]
}
