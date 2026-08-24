import type { ButtonHTMLAttributes } from 'react'

type Variant = 'solid' | 'ghost'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  small?: boolean
}

/**
 * Bouton de l'application.
 *
 * La largeur par défaut est pleine, parce que c'est le cas de très loin le
 * plus fréquent — un bouton d'action en bas de formulaire.
 */
const BASE =
  'flex items-center justify-center gap-2 rounded-[13px] font-display font-bold uppercase tracking-[0.09em] transition-transform active:scale-[0.98] disabled:opacity-35 disabled:active:scale-100'

const VARIANTS: Record<Variant, string> = {
  solid: 'bg-text text-bg',
  ghost: 'border border-line2 bg-transparent text-text',
}

/**
 * Une largeur imposée par l'appelant doit l'emporter sur `w-full`.
 *
 * Tailwind ne le fait pas tout seul : deux utilitaires de largeur ont la même
 * spécificité, et c'est l'ordre dans la feuille générée qui tranche, jamais
 * l'ordre dans l'attribut `class`. Écrire `w-[92px]` après `w-full` ne suffit
 * donc pas — c'est ce qui écrasait le champ de saisie du coach à trente
 * pixels. On retire `w-full` plutôt que d'espérer le supplanter.
 */
const LARGEUR_IMPOSEE = /(^|\s)(w-|min-w-|max-w-|size-|flex-1)/

export function Button({ variant = 'solid', small, className = '', ...props }: Props) {
  const size = small ? 'p-2.5 text-[13px] rounded-[10px]' : 'p-[15px] text-base'
  const largeur = LARGEUR_IMPOSEE.test(className) ? '' : 'w-full'
  return (
    <button className={`${BASE} ${VARIANTS[variant]} ${size} ${largeur} ${className}`} {...props} />
  )
}
