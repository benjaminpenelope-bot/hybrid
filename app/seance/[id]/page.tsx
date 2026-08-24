import { redirect } from 'next/navigation'
import { loadState } from '@/lib/db/queries'
import { currentUserId } from '@/lib/supabase/server'
import { SessionRunner } from './runner'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Séance · Hybrid' }

export default async function Page({ params }: { params: { id: string } }) {
  const userId = await currentUserId()
  if (!userId) redirect('/login')

  const state = await loadState(userId)
  const session = state?.sessions.find((s) => s.id === params.id)
  if (!session) redirect('/')

  // Une séance validée avec ses détails s'ouvre sur son résumé. Une séance
  // marquée « fait » sans détail reste ouverte : il manque encore les chiffres.
  if (session.status === 'done' && session.log) redirect(`/seance/${session.id}/resume`)

  return <SessionRunner session={session} />
}
