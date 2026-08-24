import { createClient } from '@/lib/supabase/server'
import type { AthleteState } from '@/lib/engine/types'
import {
  stateFromRows,
  type BenchmarkRow,
  type MeasurementRow,
  type PhotoRow,
  type ProfileRow,
  type RecordRow,
  type SessionRow,
  type WeightRow,
  type WellnessRow,
} from './mappers'

/**
 * Lecture de l'état complet d'un athlète.
 * La RLS filtre déjà sur l'utilisateur connecté : les requêtes n'ont pas
 * besoin de répéter le `user_id`, mais on le fait quand même, pour que la
 * requête reste juste si elle est un jour exécutée avec la clé service.
 */
export async function loadState(userId: string): Promise<AthleteState | null> {
  const supabase = createClient()

  const [profile, sessions, weights, measurements, photos, wellness, benchmarks, records] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('sessions').select('*').eq('user_id', userId).order('date'),
      supabase.from('weights').select('date, kg, source').eq('user_id', userId).order('date'),
      supabase
        .from('measurements')
        .select('date, waist, chest, arm, thigh')
        .eq('user_id', userId)
        .order('date'),
      supabase.from('photos').select('date, storage_path').eq('user_id', userId).order('date'),
      supabase
        .from('wellness')
        .select('date, sleep, fatigue, motivation, soreness, resting_hr')
        .eq('user_id', userId)
        .order('date'),
      supabase
        .from('benchmarks')
        .select('key, value, unit, partial, note, tested_at')
        .eq('user_id', userId)
        .order('tested_at'),
      supabase.from('records').select('label, value, date').eq('user_id', userId).order('date'),
    ])

  if (!profile.data) return null

  return stateFromRows({
    profile: profile.data as ProfileRow,
    sessions: (sessions.data ?? []) as SessionRow[],
    weights: (weights.data ?? []) as WeightRow[],
    measurements: (measurements.data ?? []) as MeasurementRow[],
    photos: (photos.data ?? []) as PhotoRow[],
    wellness: (wellness.data ?? []) as WellnessRow[],
    benchmarks: (benchmarks.data ?? []) as BenchmarkRow[],
    records: (records.data ?? []) as RecordRow[],
  })
}

/** true quand l'athlète a terminé son onboarding. */
export async function isOnboarded(userId: string): Promise<boolean> {
  const supabase = createClient()
  const { data } = await supabase
    .from('profiles')
    .select('onboarded_at')
    .eq('id', userId)
    .maybeSingle()
  return !!data?.onboarded_at
}
