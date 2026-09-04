import { redirect } from 'next/navigation'
import { UNITE_CHARGE } from '@/lib/engine/load'
import { Stat } from '@/components/ui/stat'
import { loadState } from '@/lib/db/queries'
import {
  nextWeekPlan,
  weekScore,
  whatMustProgress,
  whatProgresses,
} from '@/lib/engine/advice'
import { addDays, formatDate, formatPeriode, todayISO } from '@/lib/engine/date'
import { computeRecovery } from '@/lib/engine/recovery'
import { buildReview } from '@/lib/engine/review'
import { computeScores } from '@/lib/engine/scoring'
import { currentUserId } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Bilan · Hybrid' }

export default async function Page() {
  const userId = await currentUserId()
  if (!userId) redirect('/login')

  const state = await loadState(userId)
  if (!state || state.sessions.length === 0) redirect('/onboarding')

  const today = todayISO()
  const scores = computeScores(state, today)
  const recovery = computeRecovery(state, today)
  const week = buildReview(state, today, 7)
  const month = buildReview(state, today, 30)
  const progress = whatProgresses(state, today)
  const gaps = whatMustProgress(state, today, scores.missing)
  const plan = nextWeekPlan(state, today)

  const value = (label: string) => week.metrics.find((m) => m.label === label)
  const km = value('Course')
  const swimM = value('Natation')
  const reps = value('Volume à la barre')
  const weight = value('Poids moyen')

  /** Le mensuel n'a de sens qu'avec un mois d'historique derrière. */
  const firstDone = state.sessions
    .filter((s) => s.status === 'done')
    .map((s) => s.date)
    .sort()[0]
  const monthlyReady =
    firstDone !== undefined &&
    (new Date(today).getTime() - new Date(firstDone).getTime()) / 86400000 >= 30

  const score = weekScore(state, today)

  return (
    <main className="wrap py-[18px]">
      <h1 className="dsp text-[22px]">Ton bilan</h1>
      {/* La periode, datee. « 7 derniers jours » obligeait a compter soi-meme
          de quel dimanche on parlait. */}
      <p className="text-[12.5px] text-dim">
        Semaine {formatPeriode(addDays(today, -6), today)}
      </p>

      {/*
        Le score ouvre le bilan.
        
        Il figurait en cinquieme position, apres six tuiles et trois blocs de
        prose : le chiffre qui resume la semaine arrivait une fois la semaine
        deja racontee. Un bilan commence par son verdict, et le detail vient
        l'expliquer.
      */}
      <section className="glass mt-4 flex items-center justify-between gap-4 rounded-card p-5">
        <div className="min-w-0">
          <p className="eyebrow">Score de la semaine</p>
          <p className="mt-1.5 text-[13px] leading-6 text-mut">
            {week.done} séance{week.done > 1 ? 's' : ''} sur {week.planned} prévue
            {week.planned > 1 ? 's' : ''}. Assiduité 60 %, volume atteint 40 %.
          </p>
        </div>
        <span className="num shrink-0 text-[44px] leading-none">{score}</span>
      </section>

      <div className="mt-6 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Stat label="Séances" value={`${week.done}/${week.planned}`} sub="réalisées / prévues" />
        <Stat
          label="Course"
          value={km?.value.replace(' km', '') ?? '0'}
          sub={km?.delta === null || km?.delta === undefined ? 'km' : `km · ${km.delta > 0 ? '+' : ''}${km.delta} % vs S-1`}
          color="var(--run)"
        />
        <Stat
          label="Natation"
          value={swimM?.value === 'non mesurée' ? '—' : (swimM?.value.replace(' m', '') ?? '—')}
          sub={swimM?.value === 'non mesurée' ? 'distance non comptée' : 'm'}
          color={swimM?.value === 'non mesurée' ? 'var(--warn)' : 'var(--swim)'}
        />
        <Stat
          label="Volume barre"
          value={reps?.value === 'non mesuré' ? '—' : (reps?.value.replace(' répétitions', '') ?? '—')}
          sub="répétitions"
          color="var(--street)"
        />
        <Stat
          label="Poids moyen"
          value={weight?.value === 'aucune pesée' ? '—' : (weight?.value.replace(' kg', '') ?? '—')}
          sub={weight?.value === 'aucune pesée' ? 'aucune pesée' : 'kg'}
        />
        <Stat label="Charge" value={`${recovery.l7}`} sub={UNITE_CHARGE} />
      </div>

      <div className="colonnes mt-6">
      {progress && (
        <section>
          <h2 className="eyebrow mb-2.5">Ce qui progresse</h2>
          <div className="card">
            <p className="text-[13px] leading-relaxed text-mut">
              <b className="text-text">{progress.title}</b> {progress.text}
            </p>
          </div>
        </section>
      )}

      {gaps.length > 0 && (
        <section className="mt-6">
          <h2 className="eyebrow mb-2.5">Ce qui doit progresser</h2>
          <div className="card">
            {gaps.map((g, i) => (
              <p
                key={g.title}
                className={`text-[13px] leading-relaxed text-mut ${i > 0 ? 'mt-2.5' : ''}`}
              >
                <b className="text-text">{g.title}</b> {g.text}
              </p>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6">
        <h2 className="eyebrow mb-2.5">Ce qu&apos;on ajuste la semaine prochaine</h2>
        <div className="card">
          <p className="text-[13px] leading-relaxed text-mut">{plan.text}</p>
          {plan.vigilance && (
            <p className="mt-3 text-[13px] leading-relaxed text-mut">
              <b className="text-warn">Point de vigilance : </b>
              {plan.vigilance}
            </p>
          )}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="eyebrow mb-2.5">Bilan mensuel</h2>
        {monthlyReady ? (
          <div className="card divide-y divide-line py-0">
            {month.metrics.map((m) => (
              <div key={m.label} className="flex items-center justify-between py-3">
                <span className="text-[13px] text-mut">{m.label}</span>
                <span className="flex items-baseline gap-2.5">
                  <span className="num text-[15px]">{m.value}</span>
                  {m.delta !== null && m.delta !== 0 ? (
                    <span
                      className="num text-[11.5px]"
                      style={{ color: m.delta > 0 ? 'var(--ok)' : 'var(--mut)' }}
                    >
                      {m.delta > 0 ? '+' : ''}
                      {m.delta} %
                    </span>
                  ) : (
                    <span className="num text-[11px] text-dim">rien à comparer</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        ) : (
          /*
            Une ligne, pas une carte. Pendant le premier mois, cette section
            n'a rien a montrer : lui donner la meme place qu'aux autres
            revenait a consacrer un bloc entier a dire qu'il n'y a rien.
          */
          <p className="text-[12.5px] leading-relaxed text-dim">
            À partir du{' '}
            {firstDone
              ? formatDate(
                  new Date(new Date(firstDone).getTime() + 30 * 86400000)
                    .toISOString()
                    .slice(0, 10),
                )
              : 'premier mois enregistré'}
            , mois par mois : course, natation, poids, répétitions.
          </p>
        )}
      </section>

      {month.records.length > 0 && (
        <section className="mt-6">
          <h2 className="eyebrow mb-2.5">Records du mois</h2>
          <div className="flex flex-col gap-2">
            {month.records.map((r) => (
              <div
                key={`${r.label}-${r.date}`}
                className="flex items-center justify-between rounded-card border border-warn/40 bg-warn/10 p-3"
              >
                <span className="text-[13px]">{r.label}</span>
                <span className="num text-[15px] text-warn">{r.value}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      </div>
    </main>
  )
}
