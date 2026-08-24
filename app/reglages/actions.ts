'use server'

import { revalidatePath } from 'next/cache'
import { deauthorize, StravaNonAutorise, fetchActivities } from '@/lib/strava/client'
import { accessTokenFor, forgetTokens } from '@/lib/strava/store'
import { importActivities, type ResultatImport } from '@/lib/strava/sync'
import { currentUserId } from '@/lib/supabase/server'

/** Fenêtre rattrapée par une synchronisation manuelle. */
const JOURS_RATTRAPES = 30

export interface ActionResult {
  ok: boolean
  message?: string
  resume?: ResultatImport
}

/**
 * Rattrape les activités des 30 derniers jours.
 *
 * Le webhook fait l'essentiel en temps réel ; ce bouton sert quand l'app était
 * hors ligne, quand l'abonnement webhook n'existe pas encore, ou après une
 * reconnexion.
 */
export async function syncStrava(): Promise<ActionResult> {
  const userId = await currentUserId()
  if (!userId) return { ok: false, message: 'Session expirée.' }

  let token: string | null
  try {
    token = await accessTokenFor(userId)
  } catch {
    return { ok: false, message: 'Connexion Strava expirée. Reconnecte ton compte.' }
  }
  if (!token) return { ok: false, message: 'Aucun compte Strava connecté.' }

  const depuis = new Date(Date.now() - JOURS_RATTRAPES * 24 * 3600 * 1000)

  try {
    const resume = await importActivities(userId, await fetchActivities(token, depuis))
    revalidatePath('/reglages')
    revalidatePath('/')
    revalidatePath('/semaine')
    return { ok: true, resume }
  } catch (error) {
    if (error instanceof StravaNonAutorise) {
      await forgetTokens(userId)
      return { ok: false, message: 'Strava a révoqué l’accès. Reconnecte ton compte.' }
    }
    return { ok: false, message: 'Strava n’a pas répondu. Réessaie dans un moment.' }
  }
}

/**
 * Coupe la liaison des deux côtés : chez Strava et chez nous.
 * Les séances déjà importées restent — ce sont les entraînements de l'athlète,
 * pas la propriété de Strava.
 */
export async function disconnectStrava(): Promise<ActionResult> {
  const userId = await currentUserId()
  if (!userId) return { ok: false, message: 'Session expirée.' }

  try {
    const token = await accessTokenFor(userId)
    if (token) await deauthorize(token)
  } catch {
    // Strava injoignable ou jeton déjà mort : on efface quand même de notre côté.
  }

  await forgetTokens(userId)
  revalidatePath('/reglages')
  return { ok: true }
}
