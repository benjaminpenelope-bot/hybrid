import type { Scores } from '@/lib/engine/types'

/**
 * Anneau segmenté : un arc par discipline, sa longueur vaut son poids dans le
 * score, son remplissage vaut sa note.
 *
 * Un sous-score non mesuré ne se remplit pas — mais son rail est tracé en
 * pointillés, pour qu'une discipline sans donnée ne se lise pas comme une
 * discipline ratée.
 */

const R = 86
const STROKE = 13
const CIRC = 2 * Math.PI * R
const GAP = 3.2

export function ScoreRing({ scores }: { scores: Scores }) {
  const list = Object.values(scores.subs)
  let acc = 0
  const arcs = list.map((s) => {
    const len = (s.weight / 100) * CIRC - GAP
    const arc = { ...s, offset: acc, len }
    acc += (s.weight / 100) * CIRC
    return arc
  })

  return (
    <div className="relative mx-auto h-[210px] w-[210px]">
      <svg
        width="210"
        height="210"
        viewBox="0 0 210 210"
        className="-rotate-90"
        role="img"
        aria-label={`Score global ${scores.global} sur 100${
          scores.missing > 0 ? `, partiel : ${scores.missing} % en attente de mesure` : ''
        }`}
      >
        {arcs.map((a) => (
          <g key={a.label}>
            <circle
              cx="105"
              cy="105"
              r={R}
              fill="none"
              stroke="var(--line)"
              strokeWidth={STROKE}
              strokeDasharray={
                a.score === null ? `4 4 ${a.len} ${CIRC}` : `${a.len} ${CIRC - a.len}`
              }
              strokeDashoffset={-a.offset}
              strokeLinecap="butt"
              opacity={a.score === null ? 0.55 : 1}
            />
            {a.score !== null && (
              <circle
                cx="105"
                cy="105"
                r={R}
                fill="none"
                stroke={a.color}
                strokeWidth={STROKE}
                strokeDasharray={`${a.len * (a.score / 100)} ${CIRC}`}
                strokeDashoffset={-a.offset}
                strokeLinecap="butt"
              />
            )}
          </g>
        ))}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="eyebrow text-[9.5px]">Athlete Score</div>
        <div className="num mt-0.5 text-[62px] leading-none tracking-tight">{scores.global}</div>
        <div className="mt-1 text-[11px] text-dim">
          sur 100{scores.missing > 0 ? ' · partiel' : ''}
        </div>
      </div>
    </div>
  )
}
