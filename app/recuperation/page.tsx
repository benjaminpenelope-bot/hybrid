import { redirect } from 'next/navigation'
import { Alerts } from '@/components/alerts'
import { LoadChart } from '@/components/load-chart'
import { ZONE_COLOR } from '@/components/recovery-card'
import { loadState } from '@/lib/db/queries'
import { computeAlerts } from '@/lib/engine/alerts'
import { todayISO } from '@/lib/engine/date'
import { loadSeries, LOAD_BANDS } from '@/lib/engine/load'
import { computeRecovery, ZONES } from '@/lib/engine/recovery'
import { wellnessOn } from '@/lib/engine/state'
import { currentUserId } from '@/lib/supabase/server'
import { WellnessForm } from './wellness-form'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Récupération · Athlete OS' }

export default async function Page() {
  const userId = await currentUserId()
  if (!userId) redirect('/login')

  const state = await loadState(userId)
  if (!state || state.sessions.length === 0) redirect('/onboarding')

  const today = todayISO()
  const recovery = computeRecovery(state, today)
  const alerts = computeAlerts(state, today)
  const series = loadSeries(state, 14, today)
  const color = ZONE_COLOR[recovery.zone]
  const hasHistory = state.sessions.some((s) => s.status === 'done')

  return (
    <main className="wrap py-[18px]">
      <h1 className="dsp mb-4 text-[22px]">Récupération</h1>

      <div className="colonnes">
      <section
        className="rounded-card border p-4"
        style={{
          borderColor: `${color}44`,
          background: `linear-gradient(160deg, ${color}14, transparent 65%)`,
        }}
      >
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} aria-hidden />
            <span className="dsp text-[19px]">{ZONES[recovery.zone].label}</span>
          </span>
          <span className="num text-[34px]" style={{ color }}>
            {recovery.measured ? recovery.score : '—'}
          </span>
        </div>

        <p className="mt-2.5 text-[13px] leading-relaxed text-mut">{ZONES[recovery.zone].advice}</p>

        <dl className="mt-3.5">
          {recovery.parts.map((p, i) => (
            <div
              key={p.k}
              className={`flex items-baseline justify-between py-[7px] ${
                i > 0 ? 'border-t border-line' : ''
              }`}
            >
              <dt className="text-[12.5px] text-mut">{p.k}</dt>
              <dd
                className="num text-[12.5px]"
                style={{ color: p.v === null ? 'var(--warn)' : 'var(--text)' }}
              >
                {p.detail}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-6">
        <h2 className="eyebrow mb-2.5">Ton état aujourd&apos;hui</h2>
        <WellnessForm existing={wellnessOn(state, today)} />
      </section>

      <section className="mt-6">
        <h2 className="eyebrow mb-2.5">Signaux</h2>
        <Alerts alerts={alerts} hasHistory={hasHistory} />
      </section>

      <section className="mt-6">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="eyebrow">Charge des 14 derniers jours</h2>
          <span
            className="num rounded-full border px-2 py-0.5 text-[10.5px]"
            style={{
              color:
                recovery.acwr > 1.5
                  ? 'var(--bad)'
                  : recovery.acwr > 1.3
                    ? 'var(--warn)'
                    : 'var(--ok)',
              borderColor: 'var(--line2)',
            }}
          >
            ratio {recovery.acwr.toFixed(2)}
          </span>
        </div>
        <LoadChart series={series} />
        <p className="mt-2 text-[12px] leading-relaxed text-mut">
          Charge 7 jours : <b className="text-text">{recovery.l7} u</b> · moyenne hebdomadaire de
          référence {Math.round(recovery.l28)} u.
          {recovery.acwr > 1.4
            ? " Tu montes plus vite que ce que ton corps a absorbé. Allège la semaine."
            : recovery.acwr < 0.8
              ? ' Charge en baisse : tu peux remonter progressivement.'
              : ' Progression maîtrisée.'}
        </p>
      </section>

      <section className="mt-6">
        <h2 className="eyebrow mb-2.5">Repères de charge</h2>
        <div className="card divide-y divide-line py-0">
          {LOAD_BANDS.map((band, i) => (
            <div key={band.label} className="flex items-center justify-between py-2">
              <span className="flex items-center gap-2 text-[13px]">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: ['var(--ok)', 'var(--warn)', 'var(--bad)'][i] }}
                  aria-hidden
                />
                {band.label}
              </span>
              <span className="num text-[12.5px] text-mut">{band.range}</span>
            </div>
          ))}
        </div>
      </section>
      </div>
    </main>
  )
}
