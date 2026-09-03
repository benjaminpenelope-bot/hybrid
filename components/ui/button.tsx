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
 * La capitale espacee d'origine tirait vers l'affiche sportive : elle criait
 * la meme chose sur un bouton principal et sur un lien secondaire. iOS ecrit
 * ses boutons en casse naturelle, et laisse la graisse et le fond porter la
 * hierarchie.
 */
const BASE =
  'flex items-center justify-center gap-2 rounded-full font-display font-semibold tracking-[-0.01em] transition-[transform,box-shadow] duration-200 active:scale-[0.985] disabled:opacity-35 disabled:active:scale-100'

const VARIANTS: Record<Variant, string> = {
  /*
   * Le bouton principal est blanc sur noir, avec un halo. C'est le seul
   * element d'un ecran qui en porte un : le halo designe, il ne decore pas.
   */
  solid:
    'bg-text text-bg shadow-[0_0_0_1px_rgb(255_255_255/0.5),0_0_34px_rgb(255_255_255/0.18),0_10px_30px_rgb(0_0_0/0.6)] hover:shadow-[0_0_0_1px_rgb(255_255_255/0.6),0_0_46px_rgb(255_255_255/0.26),0_10px_30px_rgb(0_0_0/0.6)]',
  /* Le secondaire est du verre : present, mais qui ne dispute rien. */
  ghost:
    'glass text-text hover:bg-[rgb(255_255_255/0.06)]',
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
  const size = small ? 'px-4 py-2.5 text-[13.5px]' : 'px-5 py-[15px] text-[16px]'
  const largeur = LARGEUR_IMPOSEE.test(className) ? '' : 'w-full'
  return (
    <button className={`${BASE} ${VARIANTS[variant]} ${size} ${largeur} ${className}`} {...props} />
  )
}
