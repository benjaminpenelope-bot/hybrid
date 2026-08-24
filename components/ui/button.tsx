import type { ButtonHTMLAttributes } from 'react'

type Variant = 'solid' | 'ghost'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  small?: boolean
}

const BASE =
  'flex w-full items-center justify-center gap-2 rounded-[13px] font-display font-bold uppercase tracking-[0.09em] transition-transform active:scale-[0.98] disabled:opacity-35 disabled:active:scale-100'

const VARIANTS: Record<Variant, string> = {
  solid: 'bg-text text-bg',
  ghost: 'border border-line2 bg-transparent text-text',
}

export function Button({ variant = 'solid', small, className = '', ...props }: Props) {
  const size = small ? 'p-2.5 text-[13px] rounded-[10px]' : 'p-[15px] text-base'
  return <button className={`${BASE} ${VARIANTS[variant]} ${size} ${className}`} {...props} />
}
