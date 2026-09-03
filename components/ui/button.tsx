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
/*
 * Le style vit dans `globals.css` (`.btn`), partage avec la dizaine de liens
 * qui doivent ressembler a un bouton sans en etre un. Le dupliquer ici
 * ramenerait la derive qu'on vient de supprimer.
 */
const BASE = 'btn'

const VARIANTS: Record<Variant, string> = {
  solid: 'btn-solid',
  ghost: 'btn-ghost',
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
  const size = small ? 'btn-sm' : ''
  const largeur = LARGEUR_IMPOSEE.test(className) ? '' : 'w-full'
  return (
    <button className={`${BASE} ${VARIANTS[variant]} ${size} ${largeur} ${className}`} {...props} />
  )
}
