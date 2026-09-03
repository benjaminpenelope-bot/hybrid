import { teinte } from '@/lib/ui/session-meta'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { loadState } from '@/lib/db/queries'
import { formatDate, todayISO } from '@/lib/engine/date'
import { computeRecovery, ZONES } from '@/lib/engine/recovery'
import { summarize } from '@/lib/engine/summary'
import { currentUserId } from '@/lib/supabase/server'
import { ZONE_CHANNEL, ZONE_COLOR } from '@/components/recovery-card'
import { SESSION_META } from '@/lib/ui/session-meta'
import { CompleterRpe } from './completer-rpe'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Séance terminée · Hybrid' }

export default async function Page({ params }: { params: { id: string } }) {
  const userId = await currentUserId()
  if (!userId) redirect('/login')

  const state = await loadState(userId)
  const session = state?.sessions.find((s) => s.id === params.id)
  if (!state || !session) redirect('/aujourdhui')

  const today = todayISO()
  const summary = summarize(state, session)
  const recovery = computeRecovery(state, today)
  const meta = SESSION_META[session.type]

  // Records et repères enregistrés le jour de la séance.
  const records = state.records.filter((r) => r.date === session.date)
  const tests = session.log?.tests ?? []

  return (
    <main className="wrap py-6">
      <header>
        <span className="eyebrow" style={{ color: meta.color }}>
          {meta.label} · {formatDate(session.date)}
        </span>
        <h1 className="dsp mt-1 text-[26px] leading-tight">Séance terminée</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-mut">{summary.volumeLabel}</p>
      </header>

      {records.length > 0 && (
        <section className="mt-5">
          <h2 className="eyebrow mb-2.5">Records</h2>
          <div className="flex flex-col gap-2">
            {records.map((r) => (
              <div
                key={`${r.label}-${r.value}`}
                className="flex items-center justify-between rounded-card border border-warn/40 bg-warn/10 p-4"
              >
                <span className="text-[13.5px]">{r.label}</span>
                <span className="num text-[18px] text-warn">{r.value}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {tests.length > 0 && (
        <section className="mt-5">
          <h2 className="eyebrow mb-2.5">Repères enregistrés</h2>
          <div className="card divide-y divide-line py-0">
            {tests.map((t) => (
              <div key={t.key} className="flex items-center justify-between py-3">
                <span className="text-[13.5px] capitalize">{t.name}</span>
                <span className="num text-[16px]">{t.value}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11.5px] leading-relaxed text-dim">
            Ces chiffres sortent de tes séries de test. Ils remplacent les « à tester » dans ton
            score.
          </p>
        </section>
      )}

      <section className="mt-5">
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
          <h2 className="eyebrow">Comparaison</h2>
          <span className="text-[11px] text-dim">
            {summary.previousDate
              ? `vs ${formatDate(summary.previousDate)}`
              : 'première séance de ce type'}
          </span>
        </div>
        <div className="card divide-y divide-line py-0">
          {summary.metrics.map((m) => (
            <div key={m.label} className="flex items-center justify-between py-3">
              <span className="text-[13.5px] text-mut">{m.label}</span>
              <span className="flex items-baseline gap-2.5">
                <span className="num text-[16px]">{m.value}</span>
                {m.delta !== null && m.delta !== 0 && (
                  <span
                    className="num text-[12px]"
                    style={{ color: m.delta > 0 ? 'var(--ok)' : 'var(--mut)' }}
                  >
                    {m.delta > 0 ? '+' : ''}
                    {m.delta} %
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Séance importée sans ressenti : c'est ici que l'athlète le fournit,
          sinon sa charge resterait à jamais une estimation. */}
      {session.rpe === null && <CompleterRpe sessionId={session.id} />}

      <section className="mt-5">
        <h2 className="eyebrow mb-2.5">Récupération recommandée</h2>
        <div
          className="rounded-card border p-4"
          style={{ borderColor: teinte(ZONE_CHANNEL[recovery.zone], 0.28) }}
        >
          <div className="flex items-center justify-between">
            <span className="dsp text-[17px]">{ZONES[recovery.zone].label}</span>
            <span className="num text-[24px]" style={{ color: ZONE_COLOR[recovery.zone] }}>
              {recovery.measured ? recovery.score : '—'}
            </span>
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-mut">
            {ZONES[recovery.zone].advice}
          </p>
        </div>
      </section>

      {session.pain && (
        <p className="mt-4 rounded-card border border-bad/40 bg-bad/10 p-4 text-[12.5px] leading-relaxed text-text">
          Douleur signalée : « {session.pain} ». Les deux prochaines séances ont été allégées.
          Réduis ou interromps l&apos;activité concernée. Si elle persiste au-delà de quelques
          jours ou s&apos;aggrave, consulte un professionnel de santé — cette application ne pose
          aucun diagnostic.
        </p>
      )}

      <Link
        href="/aujourdhui"
        className="mt-6 btn btn-solid w-full"
      >
        Retour à l&apos;accueil
      </Link>
    </main>
  )
}
