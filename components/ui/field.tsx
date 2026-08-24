'use client'

import type { InputHTMLAttributes, ReactNode } from 'react'
import { useId } from 'react'

const INPUT =
  'w-full rounded-[11px] border border-line2 bg-bg2 px-[13px] py-3 text-base text-text outline-none transition-colors focus:border-mut'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: ReactNode
  suffix?: string
}

export function Field({ label, hint, suffix, className = '', ...props }: FieldProps) {
  const id = useId()
  return (
    <div className="mb-4">
      <label htmlFor={id} className="eyebrow mb-[7px] block">
        {label}
      </label>
      <div className="relative">
        <input id={id} className={`${INPUT} ${suffix ? 'pr-12' : ''} ${className}`} {...props} />
        {suffix && (
          <span className="num pointer-events-none absolute right-[13px] top-1/2 -translate-y-1/2 text-[13px] text-dim">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="mt-[7px] text-[11.5px] leading-relaxed text-dim">{hint}</p>}
    </div>
  )
}

/** Bloc de question : intitulé, aide facultative, contenu. */
export function Question({
  label,
  hint,
  children,
}: {
  label: string
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="mb-4">
      <div className="eyebrow mb-[7px]">{label}</div>
      {hint && <p className="mb-[9px] text-[11.5px] leading-relaxed text-dim">{hint}</p>}
      {children}
    </div>
  )
}
