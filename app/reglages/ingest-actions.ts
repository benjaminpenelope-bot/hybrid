'use server'

import { revalidatePath } from 'next/cache'
import { creerJeton } from '@/lib/ingest/jeton'
import { createClient } from '@/lib/supabase/server'

/**
 * CREATION DU JETON D'IMPORT
 *
 * Il n'est montre qu'une fois. Le serveur n'en garde que l'empreinte : il a
 * besoin de reconnaitre celui qu'on lui presente, jamais de le relire. Le
 * regenerer revoque le precedent — c'est ce qu'on veut quand un telephone est
 * perdu ou un raccourci partage par erreur.
 */
export type ResultatJeton = { ok: true; jeton: string } | { ok: false; message: string }

export async function genererJetonImport(): Promise<ResultatJeton> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Session expirée.' }

  const { jeton, empreinte } = creerJeton()
  const { error } = await supabase
    .from('profiles')
    .update({
      ingest_token_hash: empreinte,
      ingest_token_created_at: new Date().toISOString(),
      // Un nouveau jeton n'a encore rien recu : la date d'usage repart a zero,
      // sans quoi l'ecran afficherait l'envoi du jeton precedent.
      ingest_token_last_used_at: null,
    })
    .eq('id', user.id)
  if (error) return { ok: false, message: error.message }

  revalidatePath('/reglages')
  return { ok: true, jeton }
}
