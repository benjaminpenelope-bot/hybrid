'use client'

import { UNITE_CHARGE } from '@/lib/engine/load'
import { fr } from '@/lib/ui/nombre'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { GAIN_MAX_KG_SEMAINE, type WeightTrend } from '@/lib/engine/body'
import type { WeekPoint } from '@/lib/engine/history'

/**
 * Graphiques longs des grands écrans.
 *
 * Ils ne montrent que des semaines réellement observées : weeklySeries coupe
 * tout ce qui précède la première séance connue. Une semaine à zéro veut donc
 * bien dire « rien fait », jamais « rien su ».
 */

const AXIS = { fill: 'var(--dim)', fontSize: 10 } as const

const TOOLTIP = {
  contentStyle: {
    background: 'var(--card-hi)',
    border: '1px solid var(--line2)',
    borderRadius: 10,
    fontSize: 12,
  },
  labelStyle: { color: 'var(--mut)', fontSize: 11 },
  cursor: { fill: 'rgba(255,255,255,0.03)' },
} as const

function Vide({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-[13px] leading-relaxed text-mut">{children}</p>
}

function Panneau({
  titre,
  detail,
  note,
  children,
}: {
  titre: string
  detail?: string
  note?: string
  children: React.ReactNode
}) {
  return (
    <section className="card p-[13px]">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h3 className="eyebrow">{titre}</h3>
        {detail && <span className="num text-[12px] text-mut">{detail}</span>}
      </div>
      {children}
      {note && <p className="mt-1.5 text-[11.5px] leading-relaxed text-dim">{note}</p>}
    </section>
  )
}

/** Volume par semaine : course en km, natation en mètres. Deux unités, deux axes. */
export function VolumeChart({ series }: { series: WeekPoint[] }) {
  const totalKm = Math.round(series.reduce((a, p) => a + p.km, 0) * 10) / 10
  const vide = series.every((p) => p.km === 0 && p.swimM === 0)

  return (
    <Panneau
      titre="Volume par semaine"
      detail={vide ? undefined : `${totalKm} km cumulés`}
      note="Distances issues des séances validées, pas des séances prévues."
    >
      {vide ? (
        <Vide>Aucune distance enregistrée pour l&apos;instant.</Vide>
      ) : (
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={series} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
            <YAxis yAxisId="km" tick={AXIS} axisLine={false} tickLine={false} width={30} />
            <YAxis
              yAxisId="m"
              orientation="right"
              tick={AXIS}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              {...TOOLTIP}
              formatter={(v: number, n: string) =>
                n === 'Course' ? [`${v} km`, n] : [`${v} m`, n]
              }
            />
            <Legend wrapperStyle={{ fontSize: 11, color: 'var(--mut)' }} />
            <Bar
              yAxisId="km"
              dataKey="km"
              name="Course"
              fill="var(--run)"
              radius={[3, 3, 0, 0]}
              maxBarSize={28}
            />
            <Bar
              yAxisId="m"
              dataKey="swimM"
              name="Natation"
              fill="var(--swim)"
              radius={[3, 3, 0, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Panneau>
  )
}

/** Charge hebdomadaire avec la moyenne de la période en repère. */
export function WeeklyLoadChart({ series }: { series: WeekPoint[] }) {
  const charges = series.map((p) => p.load)
  const vide = charges.every((c) => c === 0)
  const moyenne = charges.length > 0 ? Math.round(charges.reduce((a, c) => a + c, 0) / charges.length) : 0

  return (
    <Panneau
      titre="Charge par semaine"
      detail={vide || series.length < 2 ? undefined : `moyenne ${moyenne}`}
      note="Charge = durée × RPE, cumulée sur la semaine. Une marche trop haute d'une semaine à l'autre est ce que surveillent les signaux."
    >
      {vide ? (
        <Vide>Pas encore de charge enregistrée.</Vide>
      ) : (
        <ResponsiveContainer width="100%" height={170}>
          <BarChart data={series} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS} axisLine={false} tickLine={false} width={38} />
            <Tooltip {...TOOLTIP} formatter={(v: number) => [`${v} ${UNITE_CHARGE}`, 'Charge']} />
            {/* Le repère de moyenne n'a de sens qu'à partir de deux semaines. */}
            {series.length > 1 && (
              <ReferenceLine y={moyenne} stroke="var(--line2)" strokeDasharray="4 4" />
            )}
            <Bar dataKey="load" fill="var(--run)" radius={[3, 3, 0, 0]} maxBarSize={44} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Panneau>
  )
}

/**
 * Séances faites sur séances prévues. Les semaines à venir sont exclues :
 * une semaine pas encore vécue n'est pas une semaine ratée.
 */
export function AdherenceChart({ series }: { series: WeekPoint[] }) {
  const passees = series.slice(0, -1).filter((p) => p.planned > 0)
  const data = passees.map((p) => ({
    ...p,
    taux: Math.round((p.done / p.planned) * 100),
  }))
  const moyenne =
    data.length > 0 ? Math.round(data.reduce((a, p) => a + p.taux, 0) / data.length) : null

  return (
    <Panneau
      titre="Assiduité"
      detail={moyenne === null ? undefined : `${moyenne} % en moyenne`}
      note="Séances validées sur séances prévues. La semaine en cours n'est pas comptée tant qu'elle n'est pas finie."
    >
      {data.length === 0 ? (
        <Vide>Il faut une semaine complète derrière toi pour que ce taux ait un sens.</Vide>
      ) : (
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
            <YAxis
              tick={AXIS}
              axisLine={false}
              tickLine={false}
              width={34}
              domain={[0, 100]}
              ticks={[0, 50, 100]}
            />
            <Tooltip
              {...TOOLTIP}
              formatter={(v: number, _n: unknown, item: { payload?: unknown }) => {
                const p = item.payload as { done: number; planned: number } | undefined
                return [p ? `${v} % · ${p.done}/${p.planned}` : `${v} %`, 'Assiduité']
              }}
            />
            <Bar dataKey="taux" radius={[3, 3, 0, 0]} maxBarSize={44}>
              {data.map((p) => (
                <Cell
                  key={p.week}
                  fill={p.taux >= 85 ? 'var(--ok)' : p.taux >= 60 ? 'var(--warn)' : 'var(--bad)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Panneau>
  )
}

/**
 * Courbe de poids, en moyennes hebdomadaires.
 *
 * L'objectif est tracé en repère, mais rien n'est extrapolé vers lui : la
 * courbe s'arrête à la dernière pesée. La vitesse de prise ne s'affiche que
 * si l'historique permet de la calculer.
 */
export function WeightChart({ trend, goalWeight }: { trend: WeightTrend; goalWeight: number }) {
  const { weekly, rate, current, tooFast } = trend
  const points = weekly.map((w) => ({
    ...w,
    label: `${Number(w.date.slice(8, 10))}/${Number(w.date.slice(5, 7))}`,
  }))

  return (
    <Panneau titre="Poids" detail={`${fr(current)} kg`}>
      {points.length < 2 ? (
        <Vide>
          {points.length === 0
            ? 'Aucune pesée enregistrée.'
            : 'Une seule pesée : il en faut une deuxième pour tracer une tendance.'}
        </Vide>
      ) : (
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
            <YAxis
              tick={AXIS}
              axisLine={false}
              tickLine={false}
              width={38}
              domain={['dataMin - 1', 'dataMax + 1']}
              tickFormatter={(v: number) => fr(v)}
            />
            <Tooltip {...TOOLTIP} formatter={(v: number) => [`${fr(v)} kg`, 'Poids']} />
            <ReferenceLine y={goalWeight} stroke="var(--ok)" strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="kg"
              stroke="var(--physique)"
              strokeWidth={2}
              dot={{ r: 2.5, fill: 'var(--physique)' }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      <dl className="mt-3 flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <dt className="text-[12.5px] text-mut">Objectif</dt>
          <dd className="num text-[12.5px]">{fr(goalWeight)} kg</dd>
        </div>
        <div className="flex items-baseline justify-between border-t border-line pt-2">
          <dt className="text-[12.5px] text-mut">Vitesse</dt>
          <dd
            className="num text-[12.5px]"
            style={{ color: rate === null ? 'var(--warn)' : tooFast ? 'var(--warn)' : 'var(--text)' }}
          >
            {rate === null
              ? 'À MESURER'
              : `${rate >= 0 ? '+' : ''}${rate.toFixed(2)} kg/sem`}
          </dd>
        </div>
      </dl>

      <p className="mt-1.5 text-[11.5px] leading-relaxed text-dim">
        {rate === null
          ? 'Il faut deux pesées espacées d’au moins une semaine pour qu’une vitesse veuille dire quelque chose.'
          : tooFast
            ? `Au-delà de ${GAIN_MAX_KG_SEMAINE} kg par semaine, la prise se fait surtout en gras.`
            : `Moyennes par semaine. Le trait vert marque l’objectif.`}
      </p>
    </Panneau>
  )
}

/** Répartition du temps par discipline sur 4 semaines. */
export function DisciplineSplit({
  parts,
}: {
  parts: { kind: string; label: string; minutes: number; color: string }[]
}) {
  const total = parts.reduce((a, p) => a + p.minutes, 0)

  return (
    <Panneau
      titre="Répartition sur 4 semaines"
      detail={total === 0 ? undefined : `${Math.round(total / 6) / 10} h`}
      note="Temps des séances validées. Le temps de récupération n'y figure pas."
    >
      {total === 0 ? (
        <Vide>Aucune séance validée sur les 4 dernières semaines.</Vide>
      ) : (
        <>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-bg2">
            {parts
              .filter((p) => p.minutes > 0)
              .map((p) => (
                <div
                  key={p.kind}
                  style={{ width: `${(p.minutes / total) * 100}%`, background: p.color }}
                  title={`${p.label} : ${p.minutes} min`}
                />
              ))}
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {parts.map((p) => (
              <li key={p.kind} className="flex items-center gap-2.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: p.color }}
                  aria-hidden
                />
                <span className="flex-1 text-[13px]">{p.label}</span>
                <span className="num text-[12.5px] text-mut">
                  {p.minutes} min · {Math.round((p.minutes / total) * 100)} %
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panneau>
  )
}
