'use client'

import { useState, useTransition } from 'react'
import { NumPad } from '@/components/ui/numpad'
import { frMille } from '@/lib/ui/nombre'
import { OBJECTIF_PAS, partDeLObjectif, type BilanPas } from '@/lib/engine/pas'
import { enregistrerPas } from '@/app/aujourdhui/pas-actions'

/**
 * PAS DU JOUR
 *
 * Un anneau, sept barres, et de quoi saisir à la main ce qu'aucune montre n'a
 * transmis.
 *
 * Les pas ne comptent dans aucun score et n'entrent dans aucune charge :
 * marcher n'est pas s'entraîner, et les mélanger fausserait le rapport entre
 * charge aiguë et charge chronique. Ils disent autre chose — combien on bouge
 * les jours où l'on ne s'entraîne pas — et cette carte se tient donc à part.
 *
 * Une journée non mesurée reste vide, jamais à zéro : zéro voudrait dire
 * « pas un pas », ce qui n'arrive à personne.
 */

/** Rayon et circonférence de l'anneau, dans son propre repère. */
const R = 52
const CIRC = 2 * Math.PI * R

export function CartePas({ bilan, date }: { bilan: BilanPas; date: string }) {
  const [saisie, setSaisie] = useState(false)
  const [valeur, setValeur] = useState(bilan.aujourdhui ?? 0)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, demarrer] = useTransition()

  const part = partDeLObjectif(bilan.aujourdhui)
  const max = Math.max(OBJECTIF_PAS, ...bilan.serie.map((j) => j.pas ?? 0))

  return (
    <section className="card">
      <div className="flex items-center justify-between">
        <h2 className="eyebrow">Pas aujourd&rsquo;hui</h2>
        <button
          type="button"
          onClick={() => setSaisie((v) => !v)}
          className="text-[12px] text-dim active:text-mut"
        >
          {saisie ? 'Fermer' : bilan.aujourdhui === null ? 'Saisir' : 'Corriger'}
        </button>
      </div>

      <div className="mt-3 flex items-center gap-5">
        {/*
          L'anneau se lit avant le chiffre : la part d'objectif franchie se
          voit d'un coup d'oeil, la ou « 7 842 » demande de le rapporter
          mentalement a dix mille.
        */}
        <div className="relative h-[124px] w-[124px] shrink-0">
          <svg viewBox="0 0 124 124" className="h-full w-full -rotate-90">
            <circle
              cx="62"
              cy="62"
              r={R}
              fill="none"
              stroke="rgb(255 255 255 / 0.08)"
              strokeWidth="8"
            />
            {part > 0 && (
              <circle
                cx="62"
                cy="62"
                r={R}
                fill="none"
                stroke="var(--text)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${part * CIRC} ${CIRC}`}
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="num text-[24px] leading-none">
              {bilan.aujourdhui === null ? '—' : frMille(bilan.aujourdhui)}
            </span>
            <span className="mt-1 text-[10.5px] text-dim">/ {frMille(OBJECTIF_PAS)}</span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          {/*
            Sept barres, sans axe. On ne cherche pas une valeur precise mais
            une regularite : les jours creux se voient, et c'est tout ce qu'on
            demande a un compteur de pas.
          */}
          <div className="flex h-[62px] items-end gap-1.5">
            {bilan.serie.map((j) => (
              <div key={j.date} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex h-[48px] w-full items-end">
                  <div
                    className="w-full rounded-[3px]"
                    style={{
                      height: j.pas === null ? 2 : `${Math.max(4, (j.pas / max) * 48)}px`,
                      background:
                        j.pas === null
                          ? 'rgb(255 255 255 / 0.08)'
                          : j.pas >= OBJECTIF_PAS
                            ? 'var(--text)'
                            : 'rgb(255 255 255 / 0.3)',
                    }}
                  />
                </div>
                <span className="text-[9.5px] text-dim">{j.jour.slice(0, 1)}</span>
              </div>
            ))}
          </div>

          <p className="mt-2.5 text-[12px] leading-5 text-mut">
            {bilan.mesures === 0
              ? 'Rien de mesuré cette semaine. Importe ton export Apple Health, ou saisis-les à la main.'
              : `${bilan.atteints} jour${bilan.atteints > 1 ? 's' : ''} à l’objectif sur ${bilan.mesures} mesuré${bilan.mesures > 1 ? 's' : ''}, ${frMille(bilan.moyenne ?? 0)} pas en moyenne.`}
          </p>
        </div>
      </div>

      {saisie && (
        <div className="mt-4 border-t border-line pt-4">
          <NumPad label="Pas du jour" value={valeur} onChange={setValeur} step={500} max={200000} />
          <button
            type="button"
            disabled={enCours || valeur <= 0}
            onClick={() =>
              demarrer(async () => {
                setErreur(null)
                const r = await enregistrerPas({ date, pas: valeur })
                if (r.ok) setSaisie(false)
                else setErreur(r.message ?? 'Enregistrement impossible.')
              })
            }
            className="btn btn-solid btn-sm w-full"
          >
            {enCours ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          {erreur && (
            <p className="mt-2 rounded-[11px] border border-bad/40 bg-bad/10 p-3 text-[12.5px] leading-relaxed text-text">
              {erreur}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
