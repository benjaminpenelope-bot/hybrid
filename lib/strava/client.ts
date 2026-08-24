import 'server-only'

import type { StravaActivity } from './activity'

/**
 * APPELS À L'API STRAVA
 *
 * Serveur uniquement. Le `server-only` en tête fait échouer la compilation si
 * un composant client importe ce fichier : les jetons ne doivent jamais
 * traverser la frontière.
 */

const AUTORISE = 'https://www.strava.com/oauth/authorize'
const TOKEN = 'https://www.strava.com/oauth/token'
const API = 'https://www.strava.com/api/v3'

/** Lecture des activités, y compris privées. Aucun droit d'écriture demandé. */
const SCOPE = 'read,activity:read_all'

/**
 * Cookie portant le nonce anti-CSRF de l'échange OAuth.
 * Défini ici plutôt que dans la route : Next.js n'autorise que ses propres
 * noms d'export dans un fichier `route.ts`.
 */
export const COOKIE_ETAT = 'strava_etat'

export interface StravaTokens {
  accessToken: string
  refreshToken: string
  /** Secondes epoch. */
  expiresAt: number
  athleteId: number | null
}

export function stravaConfigured(): boolean {
  return Boolean(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET)
}

function identifiants(): { id: string; secret: string } {
  const id = process.env.STRAVA_CLIENT_ID
  const secret = process.env.STRAVA_CLIENT_SECRET
  if (!id || !secret) throw new Error('Strava non configuré.')
  return { id, secret }
}

export function authorizeUrl(redirectUri: string, state: string): string {
  const { id } = identifiants()
  const params = new URLSearchParams({
    client_id: id,
    redirect_uri: redirectUri,
    response_type: 'code',
    // `auto` laisse Strava sauter l'écran si l'athlète a déjà autorisé.
    approval_prompt: 'auto',
    scope: SCOPE,
    state,
  })
  return `${AUTORISE}?${params.toString()}`
}

interface ReponseToken {
  access_token: string
  refresh_token: string
  expires_at: number
  athlete?: { id: number }
}

async function postToken(body: Record<string, string>): Promise<StravaTokens> {
  const { id, secret } = identifiants()
  const response = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ client_id: id, client_secret: secret, ...body }),
    cache: 'no-store',
  })

  if (!response.ok) {
    // Le corps peut contenir le secret renvoyé en écho : on ne le journalise pas.
    throw new Error(`Strava a refusé la demande de jeton (${response.status}).`)
  }

  const data = (await response.json()) as ReponseToken
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
    athleteId: data.athlete?.id ?? null,
  }
}

export function exchangeCode(code: string): Promise<StravaTokens> {
  return postToken({ code, grant_type: 'authorization_code' })
}

export function refreshTokens(refreshToken: string): Promise<StravaTokens> {
  return postToken({ refresh_token: refreshToken, grant_type: 'refresh_token' })
}

async function get<T>(accessToken: string, chemin: string): Promise<T> {
  const response = await fetch(`${API}${chemin}`, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })
  if (response.status === 401) throw new StravaNonAutorise()
  if (!response.ok) throw new Error(`Strava a répondu ${response.status} sur ${chemin}.`)
  return (await response.json()) as T
}

/** Le jeton n'est plus valable : l'athlète a révoqué l'accès côté Strava. */
export class StravaNonAutorise extends Error {
  constructor() {
    super('Strava a révoqué l’accès. Reconnecte ton compte.')
    this.name = 'StravaNonAutorise'
  }
}

export function fetchActivity(accessToken: string, id: number): Promise<StravaActivity> {
  return get<StravaActivity>(accessToken, `/activities/${id}`)
}

/** Activités postérieures à une date, les plus récentes d'abord chez Strava. */
export function fetchActivities(
  accessToken: string,
  apres: Date,
  parPage = 50,
): Promise<StravaActivity[]> {
  const after = Math.floor(apres.getTime() / 1000)
  return get<StravaActivity[]>(accessToken, `/athlete/activities?after=${after}&per_page=${parPage}`)
}

/** Coupe l'accès côté Strava, pas seulement chez nous. */
export async function deauthorize(accessToken: string): Promise<void> {
  await fetch('https://www.strava.com/oauth/deauthorize', {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })
}
