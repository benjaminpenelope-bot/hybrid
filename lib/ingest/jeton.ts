import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * JETON D'IMPORT AUTOMATIQUE
 *
 * Un site web ne peut pas lire HealthKit : Apple le réserve aux applications
 * natives. L'import automatique ne peut donc pas partir du serveur — c'est au
 * téléphone d'envoyer, par un raccourci iOS déclenché chaque jour ou par une
 * application d'export automatique.
 *
 * Ce jeton authentifie cet envoi. Il est conservé haché : le serveur n'a
 * besoin que de reconnaître celui qu'on lui présente, jamais de le relire. Il
 * n'est donc montré qu'une fois, à sa création, et se régénère si on le perd.
 */

/** Trente-deux octets : de quoi rendre une recherche exhaustive sans objet. */
const OCTETS = 32

export interface JetonCree {
  /** À montrer une fois, puis à oublier. */
  jeton: string
  /** À conserver en base. */
  empreinte: string
}

export function creerJeton(): JetonCree {
  const jeton = randomBytes(OCTETS).toString('base64url')
  return { jeton, empreinte: empreinteDe(jeton) }
}

export function empreinteDe(jeton: string): string {
  return createHash('sha256').update(jeton).digest('hex')
}

/**
 * Comparaison à temps constant.
 *
 * Un `===` sur des chaînes s'arrête au premier caractère différent : le temps
 * de réponse dit alors combien de caractères étaient bons, et un jeton se
 * devine caractère par caractère. Les empreintes font toujours la même
 * longueur, donc la comparaison ne fuit rien d'autre.
 */
export function empreintesEgales(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8')
  const bb = Buffer.from(b, 'utf8')
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

/** Lit le jeton d'un en-tête `Authorization: Bearer …`, ou `null`. */
export function jetonDeLEntete(entete: string | null): string | null {
  if (!entete) return null
  const m = /^Bearer\s+(\S+)$/i.exec(entete.trim())
  return m ? (m[1] ?? null) : null
}
