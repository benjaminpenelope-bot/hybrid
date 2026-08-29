import { redirect } from 'next/navigation'
import { loadState } from '@/lib/db/queries'
import { quickPrompts } from '@/lib/coach/context'
import { openingMessage } from '@/lib/coach/local'
import { todayISO } from '@/lib/engine/date'
import { MAX_TOURS_ENVOYES } from '@/lib/coach/historique'
import { createClient, currentUserId } from '@/lib/supabase/server'
import { CoachChat } from './chat'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Coach · Hybrid' }

export default async function Page() {
  const userId = await currentUserId()
  if (!userId) redirect('/login')

  const state = await loadState(userId)
  if (!state || state.sessions.length === 0) redirect('/onboarding')

  const today = todayISO()
  const supabase = createClient()

  /*
   * On charge la fenetre d'envoi, pas un nombre choisi a part. C'est le
   * decalage entre les deux qui avait casse le coach : la page en chargeait
   * vingt, le client ajoutait le message en cours, et le serveur refusait le
   * vingt-et-unieme.
   */
  const { data } = await supabase
    .from('coach_messages')
    .select('role, content')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(MAX_TOURS_ENVOYES)

  const history = (data ?? [])
    .reverse()
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  return (
    <main className="wrap py-[18px]">
      <h1 className="dsp mb-4 text-[22px]">Coach</h1>
      <CoachChat
        opening={openingMessage(state, today)}
        history={history}
        suggestions={quickPrompts(state, today)}
      />
    </main>
  )
}
