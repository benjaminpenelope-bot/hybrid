'use client'

import { useId } from 'react'

/** Saisie numérique avec incréments : plus rapide qu'un clavier, entre deux séries. */
export function NumPad({
  label,
  value,
  onChange,
  unit,
  step = 1,
  min = 0,
  max = 9999,
  hint,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  unit?: string
  step?: number
  min?: number
  max?: number
  hint?: string
}) {
  const id = useId()
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v * 100) / 100))

  return (
    <div className="mb-4">
      <label htmlFor={id} className="eyebrow mb-[7px] block">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(clamp(value - step))}
          aria-label={`${label} moins ${step}`}
          className="h-11 w-11 shrink-0 rounded-[11px] border border-line2 bg-bg2 font-display text-[20px] text-text"
        >
          −
        </button>
        <div className="relative flex-1">
          <input
            id={id}
            type="number"
            inputMode="decimal"
            step={step}
            value={Number.isFinite(value) ? value : ''}
            onChange={(e) => onChange(clamp(Number(e.target.value)))}
            className="num w-full rounded-[11px] border border-line2 bg-bg2 px-3 py-3 text-center text-[22px] text-text outline-none focus:border-mut"
          />
          {unit && (
            <span className="num pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-dim">
              {unit}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onChange(clamp(value + step))}
          aria-label={`${label} plus ${step}`}
          className="h-11 w-11 shrink-0 rounded-[11px] border border-line2 bg-bg2 font-display text-[20px] text-text"
        >
          +
        </button>
      </div>
      {hint && <p className="mt-[7px] text-[11.5px] leading-relaxed text-dim">{hint}</p>}
    </div>
  )
}

/** Échelle 1 à 10, pour le RPE, la fatigue et la motivation. */
export function Scale({
  label,
  value,
  onChange,
  max = 10,
  hint,
}: {
  label: string
  value: number | null
  onChange: (v: number) => void
  max?: number
  hint?: string
}) {
  return (
    <fieldset className="mb-4">
      <legend className="eyebrow mb-[7px]">{label}</legend>
      <div className="flex gap-1.5">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-pressed={value === n}
            className={`num h-11 flex-1 rounded-[9px] border text-[14px] transition-colors ${
              value === n
                ? 'border-text bg-text text-bg'
                : 'border-line2 bg-bg2 text-mut'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      {hint && <p className="mt-[7px] text-[11.5px] leading-relaxed text-dim">{hint}</p>}
    </fieldset>
  )
}
