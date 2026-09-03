'use client'

import { microcycleDe, microcycleEffectif, slotFor, type Slot } from '@/lib/engine/program'
import { restWeekdayFrom } from '@/lib/validation/onboarding'
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

/** Lundi d'abord, comme partout dans l'application. 0 = dimanche. */
const JOURS = [
  { n: 1, l: 'Lun' },
  { n: 2, l: 'Mar' },
  { n: 3, l: 'Mer' },
  { n: 4, l: 'Jeu' },
  { n: 5, l: 'Ven' },
  { n: 6, l: 'Sam' },
  { n: 0, l: 'Dim' },
] as const

export function ApercuSemaine({
  objectif,
  sports = [],
  jours,
}: {
  objectif: GoalType | null
  /**
   * Sports déclarés. Vide, la semaine reste celle de l'objectif : un tableau
   * vide veut dire « on ne sait pas encore », pas « aucun sport ».
   */
  sports?: Sport[]
  /**
   * Jours d'entraînement retenus, 0 = dimanche. Non renseigné, la semaine
   * est complète.
   */
  jours?: number[]
}) {
  const micro = microcycleEffectif(microcycleDe(objectif), sports)

  /*
   * Le jour de repos se deduit des jours non retenus, et il ancre tout le
   * microcycle : deplacer le repos deplace la semaine entiere. L'apercu doit
   * donc faire le meme calcul que le generateur, sinon il annoncerait une
   * repartition que le programme livre ne contiendrait pas.
   */
  const repos = jours && jours.length > 0 ? restWeekdayFrom(jours) : 1

  return (
    <div className="flex gap-1.5">
      {JOURS.map(({ n, l }, i) => {
        const indisponible = jours !== undefined && jours.length > 0 && !jours.includes(n)
        const type = indisponible ? 'REST' : micro[slotFor(n, repos) as Slot]
        const meta = SESSION_META[type]
        const off = type === 'REST'

        return (
          <div key={l} className="flex-1">
            <div
              /*
               * La `key` porte tout ce qui peut changer la cellule : React la
               * remonte alors a chaque modification, ce qui rejoue
               * l'animation. Une transition CSS changerait la couleur sans
               * signaler que la semaine vient d'etre recomposee, et c'est
               * precisement ce qu'on veut faire sentir.
               */
              key={`${objectif}-${sports.join()}-${jours?.join()}-${l}`}
              className="entre flex h-[52px] flex-col items-center justify-center gap-1 rounded-[11px]"
              style={{
                animationDelay: `${i * 45}ms`,
                animationDuration: '0.45s',
                background: off ? 'rgb(255 255 255 / 0.03)' : teinte(SESSION_CHANNEL[type], 0.14),
                border: `1px solid ${off ? 'rgb(255 255 255 / 0.06)' : teinte(SESSION_CHANNEL[type], 0.3)}`,
                color: off ? 'var(--dim)' : meta.color,
              }}
              title={meta.label}
            >
              <meta.Icon size={16} />
            </div>
            <p className="mt-1.5 text-center text-[10.5px] text-dim">{l}</p>
          </div>
        )
      })}
    </div>
  )
}
