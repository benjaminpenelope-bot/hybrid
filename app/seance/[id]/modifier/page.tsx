import { redirect } from 'next/navigation'
import { loadState } from '@/lib/db/queries'
import { currentUserId } from '@/lib/supabase/server'
import { SessionEditor } from './editor'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Modifier la séance · Athlete OS' }

export default async function Page({ params }: { params: { id: string } }) {
  const userId = await currentUserId()
  if (!userId) redirect('/login')

  const state = await loadState(userId)
  const session = state?.sessions.find((s) => s.id === params.id)
  if (!state || !session) redirect('/semaine')

  return <SessionEditor session={session} profile={state.profile} />
}
