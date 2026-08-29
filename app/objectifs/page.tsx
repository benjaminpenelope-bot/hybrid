import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Meter } from '@/components/ui/stat'
import { loadState } from '@/lib/db/queries'
import { todayISO } from '@/lib/engine/date'
import { computeGoals, HORIZONS, LIBELLE_OBJECTIF, objectifsActifs } from '@/lib/engine/goals'
import { currentUserId } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Objectifs · Hybrid' }

export default async function Page() {
  const userId = await currentUserId()
  if (!userId) redirect('/login')

  const state = await loadState(userId)
  if (!state || state.sessions.length === 0) redirect('/onboarding')

  const today = todayISO()
  const goals = computeGoals(state, today)
  const declares = objectifsActifs(state)

  return (
    <main className="wrap py-[18px]">
      <h1 className="dsp text-[22px]">Objectifs</h1>

      {/*
        Les jalons ci-dessous sont derives de ce que l'athlete a declare. Le
        rappeler n'est pas decoratif : sans lui, une liste de paliers ressemble
        a un programme impose plutot qu'a la consequence d'un choix.
      */}
      {declares.length > 0 ? (
        <p className="mb-5 mt-2 text-[12.5px] leading-relaxed text-mut">
          Tu vises{' '}
          <span className="text-text">{LIBELLE_OBJECTIF[declares[0]!.type]}</span>
          {declares[1] && (
            <>
              , et <span className="text-text">{LIBELLE_OBJECTIF[declares[1]!.type]}</span> en
              second
            </>
          )}
          . Les jalons en découlent, et leur progression se calcule sur tes séances enregistrées.
          Un jalon dont la donnée manque n&apos;affiche pas zéro : il affiche qu&apos;il reste à
          mesurer.
        </p>
      ) : (
        <p className="mb-5 mt-2 text-[12.5px] leading-relaxed text-mut">
          Tu n&apos;as pas encore déclaré d&apos;objectif, donc rien n&apos;est supposé à ta place.
          Seul le suivi de la semaine s&apos;affiche.{' '}
          <Link href="/onboarding" className="underline">
            Déclarer un objectif
          </Link>
          .
        </p>
      )}

      <div className="colonnes">
      {HORIZONS.map((horizon) => {
        const duHorizon = goals.filter((g) => g.horizon === horizon)
        // Un objectif n'a pas forcement de jalon a chaque horizon : un titre
        // seul, sans rien dessous, se lit comme une donnee manquante.
        if (duHorizon.length === 0) return null
        return (
        <section key={horizon} className="mb-6">
          <h2 className="eyebrow mb-2.5">{horizon}</h2>
          <div className="flex flex-col gap-2">
            {duHorizon
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
        )
      })}
      </div>
    </main>
  )
}
