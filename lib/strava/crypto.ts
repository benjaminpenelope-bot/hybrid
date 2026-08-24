import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

/**
 * CHIFFREMENT DES TOKENS
 *
 * Les jetons Strava donnent accès au compte de l'athlète. Ils sont chiffrés
 * avant d'aller en base et ne sont déchiffrés que côté serveur, le temps d'un
 * appel. Une fuite de la base ne suffit donc pas à les utiliser : il faut
 * aussi la clé, qui vit dans l'environnement et jamais en base.
 *
 * AES-256-GCM : le mode authentifié détecte une modification du chiffré, ce
 * qu'un simple CBC laisserait passer.
 */

const ALGO = 'aes-256-gcm'
const IV_OCTETS = 12
const TAG_OCTETS = 16

export class CleManquante extends Error {
  constructor() {
    super("TOKEN_ENCRYPTION_KEY est absente ou invalide : la connexion Strava est désactivée.")
    this.name = 'CleManquante'
  }
}

/** 32 octets, attendus en base64. Générer avec : openssl rand -base64 32 */
function cle(): Buffer {
  const brut = process.env.TOKEN_ENCRYPTION_KEY
  if (!brut) throw new CleManquante()
  const buffer = Buffer.from(brut, 'base64')
  if (buffer.length !== 32) throw new CleManquante()
  return buffer
}

export function chiffrementDisponible(): boolean {
  try {
    cle()
    return true
  } catch {
    return false
  }
}

/**
 * Renvoie `iv.tag.chiffre`, en base64url. Un IV neuf à chaque appel : chiffrer
 * deux fois le même token ne doit pas produire deux fois le même texte.
 */
export function chiffrer(clair: string): string {
  const iv = randomBytes(IV_OCTETS)
  const cipher = createCipheriv(ALGO, cle(), iv)
  const chiffre = Buffer.concat([cipher.update(clair, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv, tag, chiffre].map((b) => b.toString('base64url')).join('.')
}

export function dechiffrer(paquet: string): string {
  const parts = paquet.split('.')
  if (parts.length !== 3) throw new Error('Token chiffré illisible.')

  const [iv, tag, chiffre] = parts.map((p) => Buffer.from(p, 'base64url'))
  if (!iv || !tag || !chiffre || iv.length !== IV_OCTETS || tag.length !== TAG_OCTETS) {
    throw new Error('Token chiffré illisible.')
  }

  const decipher = createDecipheriv(ALGO, cle(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(chiffre), decipher.final()]).toString('utf8')
}
