import { redirect } from 'next/navigation'
import { Meter } from '@/components/ui/stat'
import { loadState } from '@/lib/db/queries'
import { todayISO } from '@/lib/engine/date'
import { computeGoals, HORIZONS } from '@/lib/engine/goals'
import { currentUserId } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Objectifs · Hybrid' }

export default async function Page() {
  const userId = await currentUserId()
  if (!userId) redirect('/login')

  const state = await loadState(userId)
  if (!state || state.sessions.length === 0) redirect('/onboarding')

  const goals = computeGoals(state, todayISO())

  return (
    <main className="wrap py-[18px]">
      <h1 className="dsp text-[22px]">Objectifs</h1>
      <p className="mb-5 mt-2 text-[12.5px] leading-relaxed text-mut">
        Chaque objectif est chiffré, et sa progression se calcule sur tes séances enregistrées.
        Un objectif dont la donnée manque n&apos;affiche pas zéro : il affiche qu&apos;il reste à
        mesurer.
      </p>

      <div className="colonnes">
      {HORIZONS.map((horizon) => (
        <section key={horizon} className="mb-6">
          <h2 className="eyebrow mb-2.5">{horizon}</h2>
          <div className="flex flex-col gap-2">
            {goals
              .filter((g) => g.horizon === horizon)
              .map((g) => (
                <article key={g.label} className="card">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-[13.5px]">{g.label}</h3>
                    <span
                      className="num shrink-0 text-[15px]"
                      style={{ color: g.progress === null ? 'var(--warn)' : 'var(--text)' }}
                    >
                      {g.progress === null ? '—' : `${Math.round(g.progress)} %`}
                    </span>
                  </div>
                  <div className="mt-2.5">
                    <Meter value={g.progress} />
                  </div>
                  <p className="num mt-2 text-[11.5px] text-dim">
                    {g.current} · objectif {g.target}
                  </p>
                </article>
              ))}
          </div>
        </section>
      ))}
      </div>
    </main>
  )
}
