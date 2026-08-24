import type { ExerciseRef } from '@/lib/ui/exercises'
import type { StrengthBenchmarkKey } from '@/lib/engine/types'
import { createClient } from '@/lib/supabase/server'

/**
 * Catalogue des mouvements de force, lu depuis la table de référence.
 *
 * Il sert à nommer ce qu'on saisit : « 45 répétitions » sans exercice ne dit
 * rien, ni sur le volume réel ni sur ce qui a travaillé.
 */
export async function loadExercises(): Promise<ExerciseRef[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('exercises')
    .select('key, name, zone, unit, benchmark_key')
    .order('sort')

  return (data ?? []).map((r) => ({
    key: r.key as string,
    name: r.name as string,
    zone: r.zone as ExerciseRef['zone'],
    unit: r.unit as ExerciseRef['unit'],
    benchmarkKey: (r.benchmark_key as StrengthBenchmarkKey | null) ?? null,
  }))
}
