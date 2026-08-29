import { createClient } from '@/lib/supabase/server'

/**
 * Un profil est-il complet au regard du questionnaire actuel ?
 *
 * `onboarded_at` ne suffit plus : les comptes créés avant l'ajout des
 * objectifs et des contraintes le portent, sans avoir jamais répondu aux
 * questions correspondantes. S'y fier renverrait ces athlètes vers un accueil
 * que le coach ne sait pas encore alimenter, sans jamais leur proposer de
 * compléter.
 *
 * On teste donc la présence des réponses, pas celle du marqueur. Deux
 * conséquences : un compte ancien repasse le questionnaire une fois, et un
 * futur ajout de question se signalera de la même façon plutôt qu'en silence.
 */
export interface EtatProfil {
  complet: boolean
  /** Vrai pour un compte qui a déjà répondu à une version antérieure. */
  aRepondreDeNouveau: boolean
}

export async function etatProfil(userId: string): Promise<EtatProfil> {
  const supabase = createClient()

  const [{ data: profil }, { count: objectifs }] = await Promise.all([
    supabase
      .from('profiles')
      .select('onboarded_at, level, available_weekdays')
      .eq('id', userId)
      .maybeSingle<{ onboarded_at: string | null; level: string | null; available_weekdays: number[] }>(),
    supabase
      .from('goals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'actif'),
  ])

  const dejaPasse = Boolean(profil?.onboarded_at)
  const complet =
    dejaPasse &&
    profil?.level !== null &&
    (profil?.available_weekdays?.length ?? 0) > 0 &&
    (objectifs ?? 0) > 0

  return { complet, aRepondreDeNouveau: dejaPasse && !complet }
}
