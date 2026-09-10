import { cookies } from 'next/headers'
import { COOKIE_FUSEAU, jourDansFuseau } from '@/lib/engine/fuseau'
import type { ISODate } from '@/lib/engine/types'

/**
 * Date du jour telle que l'athlète la vit.
 *
 * À employer partout où un rendu de serveur a besoin d'« aujourd'hui » :
 * `todayISO()` y donnerait la date d'UTC, celle de Vercel, et la séance du
 * jour changerait à deux heures du matin au lieu de minuit. Voir
 * `lib/engine/fuseau`.
 *
 * Sans témoin — première visite, témoins refusés — on retombe sur l'horloge
 * du serveur. C'est le comportement d'avant, donc jamais une régression.
 */
export function jourDeLAthlete(): ISODate {
  return jourDansFuseau(cookies().get(COOKIE_FUSEAU)?.value)
}
