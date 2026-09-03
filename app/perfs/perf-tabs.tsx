'use client'

import { useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Stat } from '@/components/ui/stat'
import { formatDate } from '@/lib/engine/date'
import { pace } from '@/lib/engine/math'
import type { RunStats, StreetStats, SwimStats } from '@/lib/engine/perf'
import { timeLabel } from '@/lib/engine/perf'
import type { Blocker } from '@/lib/engine/advice'
import { SWIM_RUNGS } from '@/lib/engine/advice'
import type { CalendarAssessment, MarathonVerdict } from '@/lib/engine/marathon'
import { badgeState } from '@/lib/engine/prs'

const PHASES = ['BASE', 'BUILD', 'SPECIFIC', 'TAPER', 'RACE'] as const

type Tab = 'running' | 'natation' | 'street'

export function PerfTabs({
  run,
  swim,
  street,
  readiness,
  phase,
  verdict,
  assessment,
  targetPace,
  targetLabel,
  weeklyTarget,
  swimAdvice,
  swimNext,
  swimMinutes,
  swimBlocker,
  badges,
}: {
  run: RunStats
  swim: SwimStats
  street: StreetStats
  readiness: { pct: number }
  phase: { key: string; label: string }
  verdict: MarathonVerdict
  assessment: CalendarAssessment
  targetPace: string
  targetLabel: string
  weeklyTarget: number
  swimAdvice: string
  swimNext: number
  swimMinutes: number
  swimBlocker: Blocker | null
  badges: ReturnType<typeof badgeState>
}) {
  const [tab, setTab] = useState<Tab>('running')

  const TABS: { id: Tab; label: string }[] = [
    { id: 'running', label: 'Running' },
    { id: 'natation', label: 'Natation' },
    { id: 'street', label: 'Street' },
  ]

  return (
    <>
      <div className="segment mb-5" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className="segment-item"
            data-actif={tab === t.id}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'running' && (
        <section>
          <div
            className="card"
            style={{ background: 'linear-gradient(160deg, rgba(226,96,58,0.10), transparent 65%)' }}
          >
            <div className="flex items-center justify-between">
              <span className="eyebrow">Marathon {targetLabel}</span>
              <span
                className="rounded-full border px-2.5 py-1 font-display text-[10.5px] font-semibold uppercase tracking-[0.09em]"
                style={{
                  color: 'var(--run)',
                  borderColor: 'rgba(226,96,58,0.35)',
                  background: 'rgba(226,96,58,0.08)',
                }}
              >
                {phase.key}
              </span>
            </div>

            <div className="my-3 flex items-baseline gap-2">
              <span className="num text-[44px] leading-none">{readiness.pct}</span>
              <span className="text-[13px] text-mut">% de préparation</span>
            </div>

            <div className="h-[7px] overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full"
                style={{ width: `${readiness.pct}%`, background: 'var(--run)' }}
              />
            </div>

            <div className="mt-2.5 flex gap-1">
              {PHASES.map((p) => (
                <span
                  key={p}
                  className="eyebrow flex-1 text-center text-[8.5px]"
                  style={{ color: p === phase.key ? 'var(--run)' : 'var(--dim)' }}
                >
                  {p}
                </span>
              ))}
            </div>

            <p className="mt-3 text-[12.5px] leading-relaxed text-mut">
              <b className="text-text">{verdict.headline}</b> {verdict.detail}
            </p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Stat
              label="Volume 7 jours"
              value={`${run.km7.toFixed(1)}`}
              sub={`km · cible ${weeklyTarget}`}
              color="var(--run)"
            />
            <Stat label="Volume 30 jours" value={`${run.km30.toFixed(1)}`} sub="km" />
            <Stat
              label="Plus longue sortie"
              value={run.longest === null ? 'à mesurer' : run.longest.toFixed(1)}
              sub={run.longest === null ? undefined : 'km'}
            />
            <Stat
              label="Meilleure allure"
              value={run.bestPace === null ? 'à mesurer' : pace(run.bestPace, 1)}
              sub={run.bestPace === null ? undefined : 'min/km · 3 km et plus'}
            />
            <Stat
              label="Meilleur 5 km"
              value={run.best5k === null ? 'À TESTER' : timeLabel(run.best5k)}
              sub={run.best5k === null ? "cours 5 km d'une traite" : 'chrono'}
            />
            <Stat
              label="Meilleur 10 km"
              value={run.best10k === null ? 'À TESTER' : timeLabel(run.best10k)}
              sub={run.best10k === null ? 'jamais couru' : 'chrono'}
            />

            <Stat
              label="FC moyenne"
              value={run.avgHr === null ? 'à mesurer' : `${run.avgHr}`}
              sub={run.avgHr === null ? 'aucune sortie avec cardio' : 'bpm'}
            />
            <Stat
              label="Allure marathon cible"
              value={targetPace}
              sub={`/km pour ${targetLabel}`}
              color="var(--run)"
            />
          </div>

          {run.points.length > 1 && (
            <section className="mt-6">
              <h2 className="eyebrow mb-2.5">Distance par sortie</h2>
              <div className="card p-[13px]">
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart data={run.points}>
                    <defs>
                      <linearGradient id="distance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--run)" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="var(--run)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--line)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: 'var(--dim)', fontSize: 10 }}
                      tickFormatter={(d: string) => formatDate(d).slice(4)}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: 'var(--dim)', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={26}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--card-hi)',
                        border: '1px solid var(--line2)',
                        borderRadius: 10,
                        fontSize: 12,
                      }}
                      labelStyle={{ color: 'var(--mut)' }}
                      labelFormatter={(d: string) => formatDate(d)}
                      formatter={(v: number) => [`${v} km`, 'Distance']}
                    />
                    <Area dataKey="km" stroke="var(--run)" strokeWidth={2} fill="url(#distance)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          <section className="mt-6">
            <h2 className="eyebrow mb-2.5">Évaluation honnête du calendrier</h2>
            <div className="card">
              {assessment.paragraphs.map((p, i) => (
                <p
                  key={p.emphasis}
                  className={`text-[13px] leading-relaxed text-mut ${i > 0 ? 'mt-2.5' : ''}`}
                >
                  <b style={{ color: p.warn ? 'var(--warn)' : 'var(--text)' }}>{p.emphasis}</b>{' '}
                  {p.text}
                </p>
              ))}
            </div>
          </section>
        </section>
      )}

      {tab === 'natation' && (
        <section>
          <div
            className="card"
            style={{ background: 'linear-gradient(160deg, rgba(47,151,174,0.10), transparent 65%)' }}
          >
            <div className="eyebrow">Objectif · 1 500 m sans arrêt</div>

            <div className="my-3 flex items-baseline gap-2">
              <span className="num text-[44px] leading-none">{swim.continuous ?? 0}</span>
              <span className="text-[13px] text-mut">
                m en continu · prochain palier {swimNext} m
              </span>
            </div>

            <div className="flex gap-[3px]">
              {SWIM_RUNGS.map((rung) => {
                const reached = (swim.continuous ?? 0) >= rung
                return (
                  <div key={rung} className="flex-1 text-center">
                    <div
                      className="mb-1.5 h-1.5 rounded-full"
                      style={{ background: reached ? 'var(--swim)' : 'var(--line)' }}
                    />
                    <div
                      className="num text-[8.5px]"
                      style={{ color: reached ? 'var(--swim)' : 'var(--dim)' }}
                    >
                      {rung >= 1000 ? `${rung / 1000}k` : rung}
                    </div>
                  </div>
                )
              })}
            </div>

            <p className="mt-3.5 text-[12.5px] leading-relaxed text-mut">{swimAdvice}</p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Stat
              label="Distance continue"
              value={swim.continuous === null ? 'à mesurer' : `${swim.continuous}`}
              sub={swim.continuous === null ? undefined : 'm · record'}
              color="var(--swim)"
            />
            <Stat
              label="Distance totale"
              value={swim.totalDistance > 0 ? `${swim.totalDistance}` : '—'}
              sub={swim.totalDistance > 0 ? 'm cumulés' : 'jamais comptée'}
              color={swim.totalDistance > 0 ? undefined : 'var(--warn)'}
            />
            <Stat label="Temps dans l'eau" value={`${Math.round(swimMinutes)}`} sub="min cumulées" />
            <Stat label="Séances" value={`${swim.sessions}`} sub="enregistrées" />
            <Stat
              label="Allure / 100 m"
              value={swim.pacePer100 === null ? 'À TESTER' : pace(swim.pacePer100, 1)}
              sub={swim.pacePer100 === null ? 'chronomètre 100 m brasse' : 'min/100 m'}
            />
            <Stat
              label="Crawl"
              value={swim.crawl ? 'En cours' : 'Non acquis'}
              sub="objectif 6 mois"
              color={swim.crawl ? 'var(--swim)' : 'var(--warn)'}
            />
          </div>

          <section className="mt-6">
            <h2 className="eyebrow mb-2.5">
              {swimBlocker ? "Ce qui te bloque aujourd'hui" : 'Prochain palier'}
            </h2>
            <div className="card">
              {swimBlocker ? (
                <p className="text-[13px] leading-relaxed text-mut">
                  <b className="text-text">{swimBlocker.title}</b> {swimBlocker.text}
                </p>
              ) : (
                <p className="text-[13px] leading-relaxed text-mut">
                  Rien ne bloque : tes séances sont mesurées. Vise {swimNext} m enchaînés.
                </p>
              )}
            </div>
          </section>
        </section>
      )}

      {tab === 'street' && (
        <section>
          <div className="grid grid-cols-2 gap-2">
            {street.cards.map((c) => (
              <Stat
                key={c.key}
                label={c.label}
                value={c.value === null ? 'À TESTER' : `${c.value}${c.partial ? '+' : ''}`}
                sub={c.value === null ? 'jamais mesuré' : `objectif ${c.target}`}
                color="var(--street)"
              />
            ))}
          </div>

          <div className="card mt-3">
            <div className="flex items-baseline justify-between">
              <span className="eyebrow">Volume à la barre</span>
              <span className="num text-[20px]">{street.barVolume14d}</span>
            </div>
            <p className="mt-1 text-[11.5px] text-dim">répétitions sur 14 jours</p>
          </div>

          {street.cards.some((c) => c.value === null || c.partial) && (
            <div className="card mt-3">
              <div className="eyebrow mb-2">Protocole de test</div>
              <ol className="flex flex-col gap-1.5 text-[12.5px] leading-relaxed text-mut">
                <li>Échauffe épaules et coudes 5 min.</li>
                <li>Une seule série par repère, jusqu&apos;à la dernière répétition propre.</li>
                <li>4 min de repos complet entre deux tests.</li>
                <li>Arrête dès que la technique se dégrade : un chiffre sale ne vaut rien.</li>
              </ol>
              <p className="mt-3 text-[11.5px] leading-relaxed text-dim">
                {street.daysSinceTest === null
                  ? "Aucun repère n'a jamais été testé."
                  : `Dernier test il y a ${street.daysSinceTest} jours.`}{' '}
                Le protocole est intégré à la prochaine séance haut du corps.
              </p>
            </div>
          )}

          <div className="card mt-3">
            <div className="eyebrow mb-3">Paliers</div>
            <ul className="flex flex-col gap-2">
              {badges.map((b) => (
                <li key={b.label} className="flex items-center gap-3">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: b.got ? 'var(--street)' : 'var(--line2)' }}
                    aria-hidden
                  />
                  <span
                    className="flex-1 text-[13px]"
                    style={{ color: b.got ? 'var(--text)' : 'var(--dim)' }}
                  >
                    {b.label}
                  </span>
                  {!b.known && <span className="num text-[10px] text-warn">à tester</span>}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  )
}
