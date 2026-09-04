import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Alerts } from '@/components/alerts'
import { LogoMark } from '@/components/logo'
import { LoadChart } from '@/components/load-chart'
import { RecoveryCard } from '@/components/recovery-card'
import { ScoreRing } from '@/components/score-ring'
import { SecondaryNav } from '@/components/secondary-nav'
import { SessionCard } from '@/components/session-card'
import { SubScores } from '@/components/sub-scores'
import {
  AdherenceChart,
  DisciplineSplit,
  VolumeChart,
  WeeklyLoadChart,
  WeightChart,
} from '@/components/weekly-charts'
import { etatProfil } from '@/lib/db/profil-complet'
import { prolongerSiNecessaire } from '@/lib/db/prolonger'
import { loadState } from '@/lib/db/queries'
import { VerdictCard } from '@/components/verdict-card'
import { computeAlerts } from '@/lib/engine/alerts'
import { decide } from '@/lib/engine/decide'
import { weightTrend } from '@/lib/engine/body'
import { formatDate, todayISO } from '@/lib/engine/date'
import { disciplineSplit, weeklySeries } from '@/lib/engine/history'
import { loadSeries } from '@/lib/engine/load'
import { sum } from '@/lib/engine/math'
import { computeRecovery } from '@/lib/engine/recovery'
import { computeScores, levelOf } from '@/lib/engine/scoring'
import { hasSupabaseEnv } from '@/lib/supabase/env'
import { currentUserId } from '@/lib/supabase/server'
import { SESSION_META } from '@/lib/ui/session-meta'
import { ConfigurationRequise } from '@/app/configuration-requise'

export const dynamic = 'force-dynamic'

export default async function Page() {
  if (!hasSupabaseEnv()) return <ConfigurationRequise />

  const userId = await currentUserId()
  if (!userId) redirect('/login')

  // Un profil incomplet ne peut pas alimenter le coach : on le complete avant.
  const { complet } = await etatProfil(userId)
  if (!complet) redirect('/onboarding')

  /*
   * Le programme se prolonge avant d'etre lu, des que l'avance passe sous
   * trois semaines. Le declenchement se fait ici, et non par une tache
   * planifiee : une tache peut ne pas s'executer sans que personne le sache,
   * alors que cet appel a lieu exactement au moment ou quelqu'un a besoin de
   * ses seances. Sans effet et sans cout quand l'horizon suffit.
   */
  await prolongerSiNecessaire(userId)

  const state = await loadState(userId)
  if (!state || state.sessions.length === 0) redirect('/onboarding')

  const today = todayISO()
  const scores = computeScores(state, today)
  const recovery = computeRecovery(state, today)
  const alerts = computeAlerts(state, today, { scores })
  const level = levelOf(scores.global)
  const session = state.sessions.find((s) => s.date === today)
  const verdict = decide(state, today)
  const load = loadSeries(state, 7, today)
  const l7 = sum(load.map((p) => p.load))
  const hasHistory = state.sessions.some((s) => s.status === 'done')
  const upcoming = state.sessions.filter((s) => s.date > today).slice(0, 4)
  // Seconde colonne des grands écrans : le recul que le mobile n'a pas la place d'afficher.
  const weeks = weeklySeries(state, today, 12)
  const split = disciplineSplit(state, today, 28)
  const trend = weightTrend(state, today)

  return (
    <main className="wrap wrap-large py-[18px]">
      <header className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <LogoMark size={26} />
          <div>
          <h1 className="dsp text-[22px] tracking-[0.06em]">Hybrid</h1>
          <p className="mt-0.5 text-xs text-dim">
            {formatDate(today)} · {state.profile.name}
          </p>
          </div>
        </div>
      </header>

      {/*
        `grid-cols-1` est indispensable, pas décoratif. Sans lui, la grille n'a
        qu'une piste implicite, dimensionnée `auto` — donc sur le contenu, qui
        peut déborder le conteneur. C'est ce qui décalait tout l'accueil sur
        iPhone : l'anneau se centrait sur une colonne plus large que l'écran et
        les cartes étaient rognées à droite. Le défaut ne se reproduisait sur
        aucune largeur testée en local. `grid-cols-1` vaut `minmax(0, 1fr)` et
        reste bornée quoi qu'il arrive.
      */}
      <div className="mt-3.5 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start">
        <div>
          {/*
            L'ordre est le sujet de cet ecran : la situation, la seance, le
            bouton. Le score et les graphiques descendent sous un repli — ils
            restent consultables, mais ils n'ouvrent plus la journee. Une
            metrique qui n'aide pas a decider n'a pas sa place en tete.
          */}
          <VerdictCard verdict={verdict} />

          <section className="mt-5">
            <h2 className="eyebrow mb-2.5">Ta séance du jour</h2>
            {/* Le lisere argente designe ce qu'on vient chercher le matin :
                c'est la seule chose de l'ecran qui demande une action. */}
            <div className="lisere rounded-card">
              <SessionCard session={session} />
            </div>
          </section>

          <section className="mt-6">
            <h2 className="eyebrow mb-2.5">Prochains jours</h2>
            <ul className="flex flex-col gap-[7px]">
              {upcoming.map((s) => (
                <li key={s.id}>
                  <Link
                    href="/semaine"
                    className="flex w-full items-center gap-2.5 rounded-[13px] border border-line bg-card px-3 py-[11px] text-left"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: SESSION_META[s.type].color }}
                      aria-hidden
                    />
                    <span className="w-[62px] shrink-0 text-[12px] text-dim">
                      {formatDate(s.date)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13.5px]">{s.title}</span>
                    <span className="num shrink-0 text-[12px] text-dim">
                      {s.duration ? `${s.duration}'` : '—'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <details className="mt-7 border-t border-line pt-5">
            <summary className="eyebrow cursor-pointer text-dim">
              Où j&apos;en suis · niveau {level.n}, {level.t.toLowerCase()}
            </summary>

            <div className="mt-4">
          <ScoreRing scores={scores} />

        {scores.missing > 0 && (
          <div className="mt-2.5 flex items-start gap-2.5 rounded-card border border-line bg-bg2 p-3">
            <span className="text-[13px]" aria-hidden>
              ⚠️
            </span>
            <p className="text-[12.5px] leading-relaxed text-mut">
              <b className="text-text">{scores.missing} % du score est en attente de mesure.</b>{' '}
              Une donnée non mesurée sort du calcul : elle n&apos;est jamais remplacée par une
              estimation.
            </p>
          </div>
        )}

        <SubScores scores={scores} />

        <RecoveryCard recovery={recovery} />

        <section className="mt-6">
          <h2 className="eyebrow mb-2.5">Signaux</h2>
          <Alerts alerts={alerts} hasHistory={hasHistory} />
        </section>

        <section className="mt-6">
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="eyebrow">Charge des 7 derniers jours</h2>
            <span className="num text-[12px] text-mut">{l7}</span>
          </div>
          <LoadChart series={load} />
          {/* La definition, une fois, la ou le chiffre apparait. Ailleurs il
              n'est plus qu'un nombre a comparer a lui-meme. */}
          <p className="mt-2 text-[11.5px] leading-relaxed text-dim">
            Chaque séance compte sa durée multipliée par l’effort ressenti : une heure difficile
            pèse plus qu’une heure facile.
          </p>
        </section>
            </div>
          </details>
        </div>

        <div className="hidden flex-col gap-4 lg:flex">
          <VolumeChart series={weeks} />
          <WeeklyLoadChart series={weeks} />
          <AdherenceChart series={weeks} />
          <DisciplineSplit parts={split} />
          <WeightChart trend={trend} goalWeight={state.profile.goalWeight} />
        </div>
      </div>

      <div className="lg:hidden">
        <SecondaryNav />
      </div>

      <div className="mt-7 flex items-center justify-between gap-4">
        <p className="text-[11.5px] leading-relaxed text-dim">Étape 8 sur 9.</p>
        <form action="/auth/signout" method="post">
          <button type="submit" className="eyebrow whitespace-nowrap text-dim">
            Déconnexion
          </button>
        </form>
      </div>
    </main>
  )
}
