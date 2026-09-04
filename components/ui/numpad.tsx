'use client'

import { useId, useState } from 'react'

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
          className="h-11 w-11 shrink-0 field font-display text-[20px]"
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
          className="h-11 w-11 shrink-0 field font-display text-[20px]"
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
  min = 1,
  max = 10,
  hint,
}: {
  label: string
  value: number | null
  onChange: (v: number) => void
  /** Premiere graduation. Zero pour une reserve : voir ci-dessous. */
  min?: number
  max?: number
  hint?: string
}) {
  return (
    <fieldset className="mb-4">
      <legend className="eyebrow mb-[7px]">{label}</legend>
      <div className="flex gap-1.5">
        {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => (
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

/**
 * CHOIX D'UN NOMBRE PARMI DES VALEURS COURANTES
 *
 * Une rangée de pastilles, et le pavé numérique derrière « Autre ».
 *
 * Le pavé seul demandait, pour une distance de bassin, entre quatre et
 * seize appuis sur `+`. Or ces valeurs ne sont pas quelconques : on nage 50,
 * 100, 200 ou 400 mètres, rarement 175. La pastille rend le cas courant
 * instantané, et le pavé reste là pour tous les autres — on ne perd donc
 * aucune précision, on économise les gestes.
 */
export function ChoixNombre({
  label,
  value,
  onChange,
  options,
  unit,
  step = 1,
  hint,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  options: number[]
  unit?: string
  step?: number
  hint?: string
}) {
  /*
   * Le pavé s'ouvre de lui-même quand la valeur ne figure pas dans les
   * pastilles : sans cela, une valeur saisie à la main disparaissait de
   * l'écran au retour sur l'étape.
   */
  const [libre, setLibre] = useState(value > 0 && !options.includes(value))

  return (
    <div className="mb-4">
      <div className="eyebrow mb-[7px]">{label}</div>

      <div className="flex flex-wrap gap-1.5">
        {options.map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={!libre && value === n}
            onClick={() => {
              setLibre(false)
              onChange(n)
            }}
            className={`min-h-[38px] select-none rounded-full px-3.5 text-[13.5px] font-semibold tracking-[-0.01em] transition-[background-color,color,box-shadow] duration-200 active:scale-[0.97] ${
              !libre && value === n
                ? 'bg-[rgb(255_255_255/0.12)] text-text shadow-[inset_0_1px_0_rgb(255_255_255/0.18)]'
                : 'bg-[rgb(255_255_255/0.04)] text-mut'
            }`}
          >
            {n}
            {unit ? ` ${unit}` : ''}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={libre}
          onClick={() => setLibre(true)}
          className={`min-h-[38px] select-none rounded-full px-3.5 text-[13.5px] font-semibold tracking-[-0.01em] transition-[background-color,color,box-shadow] duration-200 active:scale-[0.97] ${
            libre
              ? 'bg-[rgb(255_255_255/0.12)] text-text shadow-[inset_0_1px_0_rgb(255_255_255/0.18)]'
              : 'bg-[rgb(255_255_255/0.04)] text-mut'
          }`}
        >
          Autre
        </button>
      </div>

      {libre && (
        <div className="mt-2.5">
          <NumPad label={label} value={value} onChange={onChange} unit={unit} step={step} />
        </div>
      )}

      {hint && !libre && (
        <p className="mt-[7px] text-[11.5px] leading-relaxed text-dim">{hint}</p>
      )}
    </div>
  )
}
