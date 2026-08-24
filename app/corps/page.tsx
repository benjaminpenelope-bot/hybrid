import { redirect } from 'next/navigation'
import { loadState } from '@/lib/db/queries'
import { weightTrend } from '@/lib/engine/body'
import { todayISO } from '@/lib/engine/date'
import { currentUserId } from '@/lib/supabase/server'
import { signedPhotoUrl } from './actions'
import { BodyView } from './body-view'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Corps · Hybrid' }

export default async function Page() {
  const userId = await currentUserId()
  if (!userId) redirect('/login')

  const state = await loadState(userId)
  if (!state) redirect('/onboarding')

  const today = todayISO()
  const weights = [...state.weights].sort((a, b) => a.date.localeCompare(b.date))
  const { rate, weekly } = weightTrend(state, today)

  const photos = await Promise.all(
    [...state.photos]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(async (p) => ({
        date: p.date,
        path: p.storagePath,
        url: await signedPhotoUrl(p.storagePath),
      })),
  )

  return (
    <main className="wrap py-[18px]">
      <h1 className="dsp mb-4 text-[22px]">Corps</h1>
      <BodyView
        profile={state.profile}
        weights={weights}
        measures={[...state.measures].sort((a, b) => a.date.localeCompare(b.date))}
        photos={photos}
        rate={rate}
        weekly={weekly}
      />
    </main>
  )
}
