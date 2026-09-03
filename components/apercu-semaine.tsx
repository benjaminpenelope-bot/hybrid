'use client'

import { microcycleDe, microcycleEffectif, type Slot } from '@/lib/engine/program'
import { SESSION_CHANNEL, SESSION_META } from '@/lib/ui/session-meta'
import { teinte } from '@/lib/ui/session-meta'
import type { GoalType, Sport } from '@/lib/engine/types'

/**
 * APERÇU DE LA SEMAINE
 *
 * Sept cellules qui se réorganisent quand on change d'objectif.
 *
 * L'étape annonce que « chaque objectif change la forme de ta semaine ».
 * L'écrire ne coûte rien et n'engage à rien ; le montrer engage. Ces sept
 * cellules ne sont pas une illustration : elles lisent le microcycle que le
 * générateur emploiera réellement, si bien qu'une divergence entre la
 * promesse et le programme livré serait impossible à cacher.
 *
 * Les jours sont calés sur un repos le lundi, valeur par défaut du profil.
 * La disponibilité réelle est demandée deux étapes plus loin et déplacera
 * l'ensemble — c'est pourquoi la légende parle de forme, pas de calendrier.
 */

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] as const

export function ApercuSemaine({
  objectif,
  sports = [],
}: {
  objectif: GoalType | null
  /**
   * Sports déclarés. Vide, la semaine reste celle de l'objectif : un tableau
   * vide veut dire « on ne sait pas encore », pas « aucun sport ».
   *
   * Renseigné, les disciplines qu'on ne pratique pas sont remplacées, comme
   * le générateur le fera. C'est ce qui rend l'étape des sports lisible : on
   * voit les nages devenir des sorties de course avant même d'avoir validé.
   */
  sports?: Sport[]
}) {
  const micro = microcycleEffectif(microcycleDe(objectif), sports)

  return (
    <div>
      <div className="flex gap-1.5">
        {JOURS.map((jour, i) => {
          const type = micro[i as Slot]
          const meta = SESSION_META[type]
          const repos = type === 'REST'

          return (
            <div key={jour} className="flex-1">
              <div
                /*
                 * `key` change avec l'objectif : React remonte la cellule,
                 * ce qui rejoue l'animation. Une simple transition CSS ne
                 * suffirait pas — la couleur change, mais rien ne signale
                 * que la semaine vient d'etre recomposee.
                 */
                key={`${objectif}-${jour}`}
                className="entre flex h-[52px] flex-col items-center justify-center gap-1 rounded-[11px]"
                style={{
                  animationDelay: `${i * 45}ms`,
                  animationDuration: '0.45s',
                  background: repos ? 'rgb(255 255 255 / 0.03)' : teinte(SESSION_CHANNEL[type], 0.14),
                  border: `1px solid ${repos ? 'rgb(255 255 255 / 0.06)' : teinte(SESSION_CHANNEL[type], 0.3)}`,
                  color: repos ? 'var(--dim)' : meta.color,
                }}
                title={meta.label}
              >
                <meta.Icon size={16} />
              </div>
              <p className="mt-1.5 text-center text-[10.5px] text-dim">{jour}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
