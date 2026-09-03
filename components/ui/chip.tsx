'use client'

/*
 * Casse naturelle, et un fond de verre plutot qu'un aplat blanc.
 *
 * Les capitales espacees venaient de l'ancienne direction artistique : elles
 * faisaient crier « Jamais » aussi fort que le bouton principal de l'ecran.
 * Une pastille choisit une valeur, elle ne declenche rien — l'aplat blanc est
 * reserve a l'action, et un ecran n'en porte qu'une.
 */
const BASE =
  'rounded-full px-3.5 py-[9px] font-display text-[13.5px] font-semibold tracking-[-0.01em] transition-[background-color,box-shadow,color] duration-200 active:scale-[0.97]'

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
        active
          ? 'bg-[rgb(255_255_255/0.12)] text-text shadow-[inset_0_1px_0_rgb(255_255_255/0.18)]'
          : 'bg-[rgb(255_255_255/0.035)] text-mut'
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
