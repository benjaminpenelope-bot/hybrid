'use client'

import { useEffect, useRef, useState } from 'react'
import { mmss } from '@/lib/engine/math'

/**
 * Timer de repos entre deux séries.
 * Le décompte est calculé sur l'horloge, pas sur un compteur incrémenté :
 * l'écran d'un téléphone qui se verrouille ne fausse pas le repos.
 */
export function RestTimer({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const startedAt = useRef(Date.now())
  const [left, setLeft] = useState(seconds)

  useEffect(() => {
    startedAt.current = Date.now()
    setLeft(seconds)
    const id = setInterval(() => {
      const elapsed = (Date.now() - startedAt.current) / 1000
      const remaining = Math.max(0, seconds - elapsed)
      setLeft(remaining)
      if (remaining <= 0) clearInterval(id)
    }, 250)
    return () => clearInterval(id)
  }, [seconds])

  const pct = seconds > 0 ? (1 - left / seconds) * 100 : 100

  return (
    <div className="card text-center">
      <div className="eyebrow">Repos</div>
      <div className="num mt-2 text-[52px] leading-none" aria-live="polite">
        {mmss(left)}
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-text transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <button
        type="button"
        onClick={onDone}
        className="mt-4 btn btn-solid w-full"
      >
        {left > 0 ? 'Passer le repos' : 'Série suivante'}
      </button>
    </div>
  )
}
