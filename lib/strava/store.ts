import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { refreshTokens, type StravaTokens } from './client'
import { chiffrer, dechiffrer } from './crypto'

/**
 * STOCKAGE DES JETONS
 *
 * Les jetons sont chiffrés avant insertion et ne sont déchiffrés qu'ici, le
 * temps d'un appel sortant. La table `integrations` a ses droits révoqués
 * pour `anon` et `authenticated` : même avec la clé publique et une session
 * valide, un client ne peut pas lire ces colonnes.
 *
 * Ce que le client peut savoir se limite à la fonction `strava_status()` :
 * connecté ou non, identifiant d'athlète, date de dernière synchro.
 */

/** Marge avant expiration : mieux vaut rafraîchir tôt qu'échouer en plein appel. */
const MARGE_SECONDES = 300

interface LigneIntegration {
  strava_athlete_id: number | null
  strava_access_token: string | null
  strava_refresh_token: string | null
  strava_expires_at: string | null
}

export async function saveTokens(userId: string, tokens: StravaTokens): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('integrations').upsert(
    {
      user_id: userId,
      strava_athlete_id: tokens.athleteId,
      strava_access_token: chiffrer(tokens.accessToken),
      strava_refresh_token: chiffrer(tokens.refreshToken),
      strava_expires_at: new Date(tokens.expiresAt * 1000).toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (error) throw new Error(`Enregistrement de la connexion Strava impossible : ${error.message}`)
}

/**
 * Renvoie un jeton d'accès valable, en le rafraîchissant au besoin.
 * `null` quand le compte n'est pas connecté.
 */
export async function accessTokenFor(userId: string): Promise<string | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('integrations')
    .select('strava_athlete_id, strava_access_token, strava_refresh_token, strava_expires_at')
    .eq('user_id', userId)
    .maybeSingle<LigneIntegration>()

  if (!data?.strava_access_token || !data.strava_refresh_token) return null

  const expiration = data.strava_expires_at ? Date.parse(data.strava_expires_at) : 0
  const encoreValable = expiration - MARGE_SECONDES * 1000 > Date.now()
  if (encoreValable) return dechiffrer(data.strava_access_token)

  // Strava fait tourner le refresh token : celui qu'on vient d'utiliser est mort.
  const frais = await refreshTokens(dechiffrer(data.strava_refresh_token))
  await saveTokens(userId, { ...frais, athleteId: frais.athleteId ?? data.strava_athlete_id })
  return frais.accessToken
}

/** Retrouve le compte lié à un athlète Strava, pour traiter un webhook. */
export async function userIdForAthlete(athleteId: number): Promise<string | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('integrations')
    .select('user_id')
    .eq('strava_athlete_id', athleteId)
    .maybeSingle<{ user_id: string }>()
  return data?.user_id ?? null
}

export async function markSynced(userId: string): Promise<void> {
  const supabase = createAdminClient()
  await supabase
    .from('integrations')
    .update({ last_sync: new Date().toISOString() })
    .eq('user_id', userId)
}

/** Efface les jetons. Les séances déjà importées restent : elles sont à l'athlète. */
export async function forgetTokens(userId: string): Promise<void> {
  const supabase = createAdminClient()
  await supabase
    .from('integrations')
    .update({
      strava_athlete_id: null,
      strava_access_token: null,
      strava_refresh_token: null,
      strava_expires_at: null,
    })
    .eq('user_id', userId)
}
