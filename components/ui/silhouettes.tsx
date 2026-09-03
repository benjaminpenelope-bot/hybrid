'use client'

import { useId } from 'react'

/**
 * SILHOUETTES
 *
 * Deux figures de verre, pour la seule question du questionnaire où un
 * pictogramme abstrait ne suffit pas : on ne choisit pas un symbole, on se
 * reconnaît dans une forme.
 *
 * Elles ne viennent pas de Lucide, et c'est volontaire. Un trait de 1,6
 * uniforme convient à une icône de navigation ; ici il faut du volume, une
 * arête claire en haut et un reflet en dessous — le même vocabulaire que les
 * blocs de verre du reste de l'application. Deux dégradés et un miroir
 * suffisent, ce qui reste plus léger qu'une image.
 *
 * Le dessin est neutre : une tête, des épaules, une queue de cheval. Aucun
 * détail de plus, parce qu'aucun n'ajouterait d'information.
 */

function Figure({ queue, size = 64 }: { queue: boolean; size?: number }) {
  /*
   * Les identifiants de dégradé sont globaux à la page : deux figures côte à
   * côte partageant le même `id` feraient pointer les deux vers le premier
   * dégradé rencontré. `useId` les rend uniques par instance.
   */
  const uid = useId()
  const verre = `v${uid}`.replace(/:/g, '')
  const fondu = `f${uid}`.replace(/:/g, '')

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 72"
      fill="none"
      aria-hidden
      style={{ display: 'block' }}
    >
      <defs>
        {/* Clair en haut, presque éteint en bas : la lumière vient du haut de
            l'écran, comme sur tous les blocs de verre de l'application. */}
        <linearGradient id={verre} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.26" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.05" />
        </linearGradient>
        {/* Le reflet s'efface vers le bas, sinon il se lit comme une seconde
            figure posée à l'envers. */}
        <linearGradient id={fondu} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <g
        fill={`url(#${verre})`}
        stroke="rgb(255 255 255 / 0.34)"
        strokeWidth="1"
        strokeLinejoin="round"
      >
        {/*
          La queue de cheval : un croissant, c'est-a-dire la difference entre
          deux cercles. Elle part du haut du crane et descend le long de la
          tete, epaisse au milieu et pointue aux deux bouts — la forme de la
          reference. Deux arcs plutot qu'une courbe de Bezier tracee a la
          main : la geometrie est exacte par construction, l'epaisseur ne
          peut pas s'effondrer en un trait au milieu du dessin.
        */}
        {queue && <path d="M30.25 4.77A9.5 9.5 0 1 1 38.25 21.93A11 11 0 0 0 30.25 4.77Z" />}
        <circle cx="26" cy="13.5" r="9.5" />
        <path d="M8 44v-3.5C8 31.4 16.1 24 26 24s18 7.4 18 16.5V44a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1Z" />
      </g>

      {/* Miroir : la même forme retournée sous la figure, effacée en dégradé.
          Sans lui, la figure flotte ; avec, elle est posée. */}
      <g fill={`url(#${fondu})`} transform="translate(0 100) scale(1 -1)">
        <path d="M8 44v-3.5C8 31.4 16.1 24 26 24s18 7.4 18 16.5V44a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1Z" />
      </g>
    </svg>
  )
}

export function SilhouetteHomme({ size }: { size?: number }) {
  return <Figure queue={false} size={size} />
}

export function SilhouetteFemme({ size }: { size?: number }) {
  return <Figure queue size={size} />
}
