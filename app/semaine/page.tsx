import { redirect } from 'next/navigation'
import { loadExercises } from '@/lib/db/exercises'
import { loadState } from '@/lib/db/queries'
import { todayISO } from '@/lib/engine/date'
import { currentUserId } from '@/lib/supabase/server'
import { WeekView } from './week-view'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Semaine · Hybrid' }

export default async function Page() {
  const userId = await currentUserId()
  if (!userId) redirect('/login')

  const state = await loadState(userId)
  if (!state || state.sessions.length === 0) redirect('/onboarding')

  const exercices = await loadExercises()

  return (
    <main className="wrap py-[18px]">
      <h1 className="dsp mb-4 text-[22px]">Semaine</h1>
      <WeekView sessions={state.sessions} today={todayISO()} exercices={exercices} />
    </main>
  )
}
