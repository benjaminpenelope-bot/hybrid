'use server'

import { redirect } from 'next/navigation'
import { exporterCompte, nomFichierExport, supprimerCompte } from '@/lib/db/compte'
import { CONFIRMATION_SUPPRESSION } from '@/lib/validation/compte'
import { createClient, currentUserId } from '@/lib/supabase/server'

/**
 * Les deux droits du RGPD, côté serveur.
 *
 * L'identifiant vient toujours de la session, jamais d'un paramètre : une
 * action qui accepterait un `userId` du client permettrait d'exporter ou
 * d'effacer le compte d'autrui.
 */

export interface ResultatExport {
  ok: boolean
  message?: string
  fichier?: string
  contenu?: string
}

export async function demanderExport(): Promise<ResultatExport> {
  const userId = await currentUserId()
  if (!userId) return { ok: false, message: 'Session expirée. Reconnecte-toi.' }

  try {
    const data = await exporterCompte(userId)
    return {
      ok: true,
      fichier: nomFichierExport(),
      contenu: JSON.stringify(data, null, 2),
    }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Export impossible.' }
  }
}

export async function demanderSuppression(
  confirmation: string,
): Promise<{ ok: false; message: string }> {
  const userId = await currentUserId()
  if (!userId) return { ok: false, message: 'Session expirée. Reconnecte-toi.' }

  if (confirmation.trim() !== CONFIRMATION_SUPPRESSION) {
    return {
      ok: false,
      message: `Recopie ${CONFIRMATION_SUPPRESSION} pour confirmer. Rien n’a été supprimé.`,
    }
  }

  try {
    await supprimerCompte(userId)
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Suppression impossible.' }
  }

  // La session ne vaut plus rien une fois le compte parti, mais la fermer
  // explicitement evite de laisser un cookie pointer vers un compte absent.
  await createClient().auth.signOut()
  redirect('/login?compte=supprime')
}
