'use client'

import { Bar, BarChart, ResponsiveContainer, XAxis } from 'recharts'
import type { LoadPoint } from '@/lib/engine/load'

/**
 * Charge des 7 derniers jours. Une barre par jour, en unités sRPE.
 * Les jours dont le RPE est estimé plutôt que saisi sont tramés :
 * une estimation ne se lit pas comme une mesure.
 */
export function LoadChart({ series }: { series: LoadPoint[] }) {
  const estimated = series.some((p) => p.est && p.load > 0)
  const empty = series.every((p) => p.load === 0)

  return (
    <div className="card p-[13px]">
      {empty ? (
        <p className="py-4 text-center text-[13px] leading-relaxed text-mut">
          Aucune séance enregistrée sur les 7 derniers jours. La charge se remplira dès ta
          première séance validée.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={92}>
          <BarChart data={series} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <pattern id="estime" width="4" height="4" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                <rect width="4" height="4" fill="var(--line2)" />
                <line x1="0" y1="0" x2="0" y2="4" stroke="var(--card)" strokeWidth="2" />
              </pattern>
            </defs>
            <XAxis
              dataKey="day"
              tick={{ fill: 'var(--dim)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Bar
              dataKey="load"
              radius={[4, 4, 0, 0]}
              fill="var(--line2)"
              shape={(props: unknown) => {
                const p = props as { x: number; y: number; width: number; height: number; payload: LoadPoint }
                return (
                  <rect
                    x={p.x}
                    y={p.y}
                    width={p.width}
                    height={p.height}
                    rx={4}
                    fill={p.payload.est ? 'url(#estime)' : 'var(--line2)'}
                  />
                )
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      )}

      <p className="mt-1 text-[11.5px] leading-relaxed text-dim">
        Charge = durée × RPE.
        {estimated
          ? ' Les barres tramées reposent sur un RPE estimé, pas sur un RPE que tu as saisi.'
          : ''}
      </p>
    </div>
  )
}
