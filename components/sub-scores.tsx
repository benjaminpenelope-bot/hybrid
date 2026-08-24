'use client'

import { useState } from 'react'
import type { Scores, SubScore } from '@/lib/engine/types'

/** Détail d'un sous-score : chaque composante, sa note et la donnée qui la porte. */
function Row({ sub }: { sub: SubScore }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-t border-line py-3 first:border-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 text-left"
      >
        <span className="w-5 text-[15px]" aria-hidden>
          {sub.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="mb-[5px] flex items-center justify-between">
            <span className="dsp text-[14px]">{sub.label}</span>
            <span
              className="num text-[15px]"
              style={{ color: sub.score === null ? 'var(--dim)' : 'var(--text)' }}
            >
              {sub.score === null ? '—' : sub.score}
            </span>
          </span>
          <span className="block h-1 overflow-hidden rounded-full bg-line">
            <span
              className="block h-full rounded-full"
              style={{ width: `${sub.score ?? 0}%`, background: sub.color }}
            />
          </span>
        </span>
        <span className="num w-6 text-right text-[11px] text-dim">{sub.weight} %</span>
      </button>

      {open && (
        <dl className="mt-3 pl-8">
          {sub.parts.map((p) => (
            <div key={p.k} className="flex items-baseline justify-between py-[5px]">
              <dt className="text-[12.5px] text-mut">{p.k}</dt>
              <dd
                className="num text-[12.5px]"
                style={{ color: p.v === null ? 'var(--warn)' : 'var(--text)' }}
              >
                {p.detail}
              </dd>
            </div>
          ))}
          {sub.coverage < 1 && (
            <p className="mt-2 text-[11.5px] leading-relaxed text-dim">
              {Math.round((1 - sub.coverage) * 100)} % de ce sous-score repose sur une donnée que
              tu n&apos;as pas encore mesurée.
            </p>
          )}
        </dl>
      )}
    </div>
  )
}

export function SubScores({ scores }: { scores: Scores }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="card mt-2.5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between"
      >
        <span className="eyebrow">Détail des sous-scores</span>
        <span className="text-[12px] text-dim" aria-hidden>
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open && (
        <div className="mt-1">
          {Object.values(scores.subs).map((sub) => (
            <Row key={sub.label} sub={sub} />
          ))}
        </div>
      )}
    </div>
  )
}
