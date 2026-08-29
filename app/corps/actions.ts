'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { todayISO } from '@/lib/engine/date'
import { createClient } from '@/lib/supabase/server'

export interface SaveResult {
  ok: boolean
  message?: string
}

const weightSchema = z.object({
  kg: z.number().min(30, 'Poids invalide.').max(250, 'Poids invalide.'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function saveWeight(kg: number): Promise<SaveResult> {
  const parsed = weightSchema.safeParse({ kg, date: todayISO() })
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Poids invalide.' }
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Session expirée.' }

  const { error } = await supabase
    .from('weights')
    .upsert(
      { user_id: user.id, date: parsed.data.date, kg: parsed.data.kg },
      { onConflict: 'user_id,date' },
    )
  if (error) return { ok: false, message: error.message }

  revalidatePath('/corps')
  revalidatePath('/aujourdhui')
  return { ok: true }
}

const measurementSchema = z.object({
  waist: z.number().min(30).max(200).nullable(),
  chest: z.number().min(50).max(200).nullable(),
  arm: z.number().min(15).max(80).nullable(),
  thigh: z.number().min(25).max(120).nullable(),
})

export type MeasurementInput = z.infer<typeof measurementSchema>

export async function saveMeasurement(input: MeasurementInput): Promise<SaveResult> {
  const parsed = measurementSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Mensuration invalide.' }
  }

  // Un relevé entièrement vide n'a rien à enregistrer.
  const values = Object.values(parsed.data)
  if (values.every((v) => v === null)) {
    return { ok: false, message: 'Renseigne au moins une mesure.' }
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Session expirée.' }

  const { error } = await supabase
    .from('measurements')
    .upsert(
      { user_id: user.id, date: todayISO(), ...parsed.data },
      { onConflict: 'user_id,date' },
    )
  if (error) return { ok: false, message: error.message }

  revalidatePath('/corps')
  return { ok: true }
}

/**
 * Photo de progression. Le fichier va dans un dossier au nom de l'utilisateur,
 * dans un bucket privé — l'affichage passe ensuite par une URL signée.
 */
export async function uploadPhoto(formData: FormData): Promise<SaveResult> {
  const file = formData.get('photo')
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: 'Aucune photo sélectionnée.' }
  }
  if (file.size > 10 * 1024 * 1024) {
    return { ok: false, message: 'Photo trop lourde : 10 Mo maximum.' }
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Session expirée.' }

  const today = todayISO()
  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${user.id}/${today}-${crypto.randomUUID()}.${extension}`

  const { error: uploadError } = await supabase.storage
    .from('progress-photos')
    .upload(path, file, { contentType: file.type, upsert: false })
  if (uploadError) return { ok: false, message: uploadError.message }

  const { error } = await supabase
    .from('photos')
    .insert({ user_id: user.id, date: today, storage_path: path })
  if (error) return { ok: false, message: error.message }

  revalidatePath('/corps')
  return { ok: true }
}

/** URL signée, valable une heure, pour afficher une photo du bucket privé. */
export async function signedPhotoUrl(path: string): Promise<string | null> {
  const supabase = createClient()
  const { data } = await supabase.storage.from('progress-photos').createSignedUrl(path, 3600)
  return data?.signedUrl ?? null
}

/**
 * Suppression d'une photo : le fichier et la ligne partent ensemble.
 * Le chemin est vérifié côté serveur — on ne supprime que dans son propre
 * dossier, quoi que le client envoie.
 */
export async function deletePhoto(path: string): Promise<SaveResult> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Session expirée.' }

  if (!path.startsWith(`${user.id}/`)) {
    return { ok: false, message: 'Cette photo ne t’appartient pas.' }
  }

  const { error: storageError } = await supabase.storage.from('progress-photos').remove([path])
  if (storageError) return { ok: false, message: storageError.message }

  const { error } = await supabase
    .from('photos')
    .delete()
    .eq('user_id', user.id)
    .eq('storage_path', path)
  if (error) return { ok: false, message: error.message }

  revalidatePath('/corps')
  return { ok: true }
}
