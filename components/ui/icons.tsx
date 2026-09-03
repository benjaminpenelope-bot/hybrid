import type { SVGProps } from 'react'

/**
 * GLYPHES DE NAVIGATION
 *
 * Dessinés ici plutôt qu'importés d'une bibliothèque : il en faut neuf, et
 * une dépendance de plusieurs centaines de kilo-octets pour neuf tracés serait
 * un mauvais échange sur une application qu'on ouvre entre deux séries.
 *
 * Ils remplacent des émojis. Un émoji est rendu par le système : sa couleur,
 * sa graisse et son style échappent complètement à l'interface — impossible
 * de le désaturer proprement, de l'aligner sur une grille, ou de le faire
 * ressembler au reste. C'est ce qui trahissait le plus l'origine bricolée de
 * la barre d'onglets.
 *
 * Tous partagent la même grille de 24, le même trait de 1,6 et `currentColor`,
 * si bien qu'ils héritent de la couleur du texte sans réglage.
 */

type Props = SVGProps<SVGSVGElement> & { size?: number }

function Glyphe({ size = 22, children, ...props }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  )
}

export function IconAccueil(p: Props) {
  return (
    <Glyphe {...p}>
      <path d="M3.5 10.6 12 3.8l8.5 6.8" />
      <path d="M5.8 9.4V19a1.2 1.2 0 0 0 1.2 1.2h10a1.2 1.2 0 0 0 1.2-1.2V9.4" />
      <path d="M9.8 20.2v-5.4h4.4v5.4" />
    </Glyphe>
  )
}

export function IconSemaine(p: Props) {
  return (
    <Glyphe {...p}>
      <rect x="3.4" y="5.2" width="17.2" height="15.4" rx="3" />
      <path d="M3.4 9.8h17.2M8.2 3.4v3.4M15.8 3.4v3.4" />
      <path d="M8 13.4h.01M12 13.4h.01M16 13.4h.01M8 16.8h.01M12 16.8h.01" />
    </Glyphe>
  )
}

export function IconPerfs(p: Props) {
  return (
    <Glyphe {...p}>
      <path d="M3.6 20.2h16.8" />
      <path d="M6.4 20.2v-5.6M11 20.2v-9.4M15.6 20.2v-6.6M20 20.2V6.4" />
    </Glyphe>
  )
}

export function IconCorps(p: Props) {
  return (
    <Glyphe {...p}>
      <circle cx="12" cy="4.9" r="2.1" />
      <path d="M12 7.4v6.2" />
      <path d="M6.6 9.6 12 8.2l5.4 1.4" />
      <path d="M9.4 20.6 12 13.6l2.6 7" />
    </Glyphe>
  )
}

export function IconCoach(p: Props) {
  return (
    <Glyphe {...p}>
      <path d="M20.4 12.6c0 3.9-3.8 7-8.4 7a9.6 9.6 0 0 1-2.6-.35L4.6 20.8l1.15-3.6A6.6 6.6 0 0 1 3.6 12.6c0-3.9 3.8-7 8.4-7s8.4 3.1 8.4 7Z" />
    </Glyphe>
  )
}

export function IconObjectifs(p: Props) {
  return (
    <Glyphe {...p}>
      <circle cx="11.4" cy="12.6" r="7.4" />
      <circle cx="11.4" cy="12.6" r="3.4" />
      <path d="m11.4 12.6 7.2-7.2M16.4 5.2h2.6v2.6" />
    </Glyphe>
  )
}

export function IconRecuperation(p: Props) {
  return (
    <Glyphe {...p}>
      <path d="M20.2 14.6A8.4 8.4 0 0 1 9.4 3.8a8.4 8.4 0 1 0 10.8 10.8Z" />
    </Glyphe>
  )
}

export function IconBilan(p: Props) {
  return (
    <Glyphe {...p}>
      <rect x="4.6" y="4.4" width="14.8" height="16.2" rx="2.6" />
      <path d="M9 3.2h6a1.2 1.2 0 0 1 1.2 1.2v1.2a1.2 1.2 0 0 1-1.2 1.2H9a1.2 1.2 0 0 1-1.2-1.2V4.4A1.2 1.2 0 0 1 9 3.2Z" />
      <path d="M8.6 11.6h6.8M8.6 15.4h4.6" />
    </Glyphe>
  )
}

export function IconReglages(p: Props) {
  return (
    <Glyphe {...p}>
      <path d="M4.4 7.6h15.2M4.4 12h15.2M4.4 16.4h15.2" />
      <circle cx="9.2" cy="7.6" r="1.9" />
      <circle cx="15.4" cy="16.4" r="1.9" />
    </Glyphe>
  )
}

/* ── Disciplines ──────────────────────────────────────────────
 *
 * Même grille, même trait. Ils remplacent les émojis 🏃 🏊 🚴 qui
 * s'affichaient dans les listes de séances : un émoji suit le style du
 * système d'exploitation, pas celui de l'application, et sur une pastille de
 * discipline il portait sa propre couleur en concurrence de celle du jeton.
 */

export function IconCourse(p: Props) {
  return (
    <Glyphe {...p}>
      <circle cx="14.6" cy="4.7" r="1.9" />
      <path d="M8 20.4l2.8-4.6-2-2.4 1.2-4.4 3.2-1.2 2.6 2.4 2.6 1" />
      <path d="M10.8 15.8l3.4 1.4 1.4 3.2" />
      <path d="M6 11.4l3-1.8" />
    </Glyphe>
  )
}

export function IconNatation(p: Props) {
  return (
    <Glyphe {...p}>
      <circle cx="16.4" cy="7.4" r="1.8" />
      <path d="M4 12.6l4.6-2.6 3.4 2.2 3.2-1.4" />
      <path d="M3.4 17.2c1.6 0 1.6 1.4 3.2 1.4s1.6-1.4 3.2-1.4 1.6 1.4 3.2 1.4 1.6-1.4 3.2-1.4 1.6 1.4 3.2 1.4" />
    </Glyphe>
  )
}

export function IconVelo(p: Props) {
  return (
    <Glyphe {...p}>
      <circle cx="5.6" cy="16.6" r="3.4" />
      <circle cx="18.4" cy="16.6" r="3.4" />
      <circle cx="14.6" cy="4.9" r="1.5" />
      <path d="M5.6 16.6l4-6.2 3.6 2.8 1.6-3.6" />
      <path d="M9.6 10.4h4.4M18.4 16.6l-2.6-6.2" />
    </Glyphe>
  )
}

export function IconBarre(p: Props) {
  return (
    <Glyphe {...p}>
      <path d="M3.4 8.6v6.8M6.4 6.8v10.4M17.6 6.8v10.4M20.6 8.6v6.8" />
      <path d="M6.4 12h11.2" />
    </Glyphe>
  )
}

export function IconJambes(p: Props) {
  return (
    <Glyphe {...p}>
      <path d="M9 3.6v6.8l-2.2 6.2 2.6 3.8" />
      <path d="M15 3.6v6.8l2.2 6.2-2.6 3.8" />
      <path d="M9 6.6h6" />
    </Glyphe>
  )
}

export function IconRepos(p: Props) {
  return (
    <Glyphe {...p}>
      <path d="M20.2 14.6A8.4 8.4 0 0 1 9.4 3.8a8.4 8.4 0 1 0 10.8 10.8Z" />
    </Glyphe>
  )
}
