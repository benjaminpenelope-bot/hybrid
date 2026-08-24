'use client'

const BASE =
  'rounded-[10px] border px-3 py-[9px] font-display text-[13px] font-semibold uppercase tracking-[0.06em] transition-colors'

export function Chip({
  active,
  children,
  onClick,
  type = 'button',
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      aria-pressed={active}
      className={`${BASE} ${
        active ? 'border-text bg-text text-bg' : 'border-line2 bg-bg2 text-mut'
      }`}
    >
      {children}
    </button>
  )
}

/** Groupe de chips à choix unique. */
export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T | null
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <Chip key={o.value} active={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </Chip>
      ))}
    </div>
  )
}

/** Groupe de chips à choix multiple. */
export function ChipMulti<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T[]
  onChange: (v: T[]) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <Chip
          key={o.value}
          active={value.includes(o.value)}
          onClick={() =>
            onChange(value.includes(o.value) ? value.filter((v) => v !== o.value) : [...value, o.value])
          }
        >
          {o.label}
        </Chip>
      ))}
    </div>
  )
}
