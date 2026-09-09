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
  labelVisible = true,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  unit?: string
  step?: number
  min?: number
  max?: number
  hint?: string
  /**
   * `false` quand le libelle est deja rendu au-dessus — c'est le cas dans
   * `ChoixNombre`, ou il s'affichait deux fois de suite des qu'on ouvrait
   * « Autre ». Il reste dans le DOM pour les lecteurs d'ecran.
   */
  labelVisible?: boolean
}) {
  const id = useId()
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v * 100) / 100))

  return (
    <div className="mb-4">
      <label htmlFor={id} className={labelVisible ? 'eyebrow mb-[7px] block' : 'sr-only'}>
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
  saisie = 'nombre',
}: {
  label: string
  value: number
  onChange: (v: number) => void
  options: number[]
  unit?: string
  step?: number
  hint?: string
  /**
   * Ce que « Autre » ouvre.
   *
   * `duree` donne deux champs, minutes et secondes. Les pastilles restent le
   * cas courant — une nage se declare en 30, 45 ou 60 minutes neuf fois sur
   * dix — mais la dixieme doit pouvoir etre exacte. Un pave au pas de cinq
   * minutes ne permettait ni 47 minutes, ni 47'30".
   */
  saisie?: 'nombre' | 'duree'
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
          {saisie === 'duree' ? (
            <DureeMinSec label={label} value={value} onChange={onChange} labelVisible={false} />
          ) : (
            <NumPad
              label={label}
              value={value}
              onChange={onChange}
              unit={unit}
              step={step}
              labelVisible={false}
            />
          )}
        </div>
      )}

      {hint && !libre && (
        <p className="mt-[7px] text-[11.5px] leading-relaxed text-dim">{hint}</p>
      )}
    </div>
  )
}

/**
 * DURÉE EN MINUTES ET SECONDES
 *
 * Le `NumPad` en minutes entières suffisait à une séance de force, jamais à
 * une sortie chronométrée : 36'40" y devenait 36, et les quarante secondes
 * disparaissaient sans que rien ne le dise. Sur 5,5 km, c'est sept secondes
 * au kilomètre d'écart sur l'allure — assez pour fausser un record et pour
 * qu'un athlète ne se reconnaisse pas dans ses propres chiffres.
 *
 * La valeur reste exprimée en minutes décimales, comme partout ailleurs dans
 * le moteur : c'est la saisie qu'on découpe, pas la donnée.
 */
export function DureeMinSec({
  label,
  value,
  onChange,
  hint,
  labelVisible = true,
}: {
  label: string
  /** Durée en minutes, décimales comprises. */
  value: number
  onChange: (v: number) => void
  hint?: string
  /** `false` quand le libelle est deja rendu au-dessus. Voir `NumPad`. */
  labelVisible?: boolean
}) {
  const idMin = useId()
  const idSec = useId()

  /*
   * On repart des secondes totales et non de `value` : 36 + 40/60 vaut
   * 36,666666666666664, dont la partie fractionnaire multipliee par soixante
   * redonne 39,999999999999964. Arrondir la seconde une seule fois, au plus
   * pres du total, evite de voir 39 s'afficher a la place de 40.
   */
  const total = Math.max(0, Math.round((Number.isFinite(value) ? value : 0) * 60))
  const min = Math.floor(total / 60)
  const sec = total % 60

  /** Quatre decimales : de quoi porter la seconde exacte sans trainer de bruit. */
  const poser = (m: number, s: number) =>
    onChange(Math.round(((m * 60 + s) / 60) * 10000) / 10000)

  const champ =
    'num w-full rounded-[11px] border border-line2 bg-bg2 px-3 py-3 text-center text-[22px] text-text outline-none focus:border-mut'

  return (
    <div className="mb-4">
      {labelVisible && <span className="eyebrow mb-[7px] block">{label}</span>}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <label htmlFor={idMin} className="sr-only">
            {label} — minutes
          </label>
          <input
            id={idMin}
            type="number"
            inputMode="numeric"
            min={0}
            max={600}
            value={min}
            onChange={(e) => poser(Math.min(600, Math.max(0, Math.floor(Number(e.target.value) || 0))), sec)}
            className={champ}
          />
          <span className="num pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-dim">
            min
          </span>
        </div>
        <div className="relative flex-1">
          <label htmlFor={idSec} className="sr-only">
            {label} — secondes
          </label>
          {/*
            Les secondes sont bornees a 59 plutot que reportees sur les
            minutes : saisir 75 et voir le champ d'a cote bouger tout seul
            surprend plus que ca n'aide.
          */}
          <input
            id={idSec}
            type="number"
            inputMode="numeric"
            min={0}
            max={59}
            value={sec}
            onChange={(e) => poser(min, Math.min(59, Math.max(0, Math.floor(Number(e.target.value) || 0))))}
            className={champ}
          />
          <span className="num pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-dim">
            s
          </span>
        </div>
      </div>
      {hint && <p className="mt-1.5 text-[11.5px] leading-relaxed text-dim">{hint}</p>}
    </div>
  )
}
