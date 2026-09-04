'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { formatJour } from '@/lib/engine/date'
import type { Limitation } from '@/lib/engine/types'
import { ajouterLimitation, cloreLimitation, rouvrirLimitation } from './actions'

/**
 * LIMITATIONS
 *
 * Ce qu'on a déclaré, et qui reste vrai jusqu'à ce qu'on dise le contraire.
 *
 * Les contraintes se déclaraient à l'inscription et n'en sortaient jamais :
 * un genou déclaré en août était encore « en cours » un an plus tard, et le
 * coach en tenait compte à chaque réponse. Une blessure guérie devenait une
 * blessure éternelle, et une gêne apparue en cours de route n'avait nulle
 * part où être dite.
 *
 * Une limitation close n'est pas effacée : elle passe en antécédent, avec sa
 * date de fin. Un corps a une histoire, et la supprimer reviendrait à faire
 * comme si elle n'avait pas eu lieu.
 */
export function Limitations({ actives, closes }: { actives: Limitation[]; closes: Limitation[] }) {
  const [ajout, setAjout] = useState(false)
  const [zone, setZone] = useState('')
  const [description, setDescription] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, demarrer] = useTransition()

  const lancer = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    demarrer(async () => {
      setErreur(null)
      const r = await fn()
      if (!r.ok) setErreur(r.message ?? 'Action impossible.')
    })

  return (
    <section className="mb-6">
      <h2 className="eyebrow mb-1">Tes limitations</h2>
      <p className="mb-2.5 text-[12px] leading-5 text-dim">
        Elles partent au coach et sont rappelées dans les preuves de chaque décision. Une gêne
        passée se clôt ici : sans quoi elle compterait indéfiniment.
      </p>

      {actives.length === 0 && !ajout && (
        <p className="text-[13px] leading-relaxed text-mut">Rien en cours.</p>
      )}

      {actives.length > 0 && (
        <div className="flex flex-col gap-2">
          {actives.map((l) => (
            <article key={l.id} className="card flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px] font-semibold tracking-[-0.01em]">{l.zone}</p>
                {l.description && (
                  <p className="mt-1 text-[12.5px] leading-5 text-mut">{l.description}</p>
                )}
                <p className="mt-1 text-[11.5px] text-dim">Depuis le {formatJour(l.startedOn)}</p>
              </div>
              <button
                type="button"
                disabled={enCours}
                onClick={() => lancer(() => cloreLimitation(l.id))}
                className="shrink-0 rounded-full border border-line px-3 py-1.5 text-[12px] text-mut disabled:opacity-40 active:bg-[rgb(255_255_255/0.05)]"
              >
                C&rsquo;est passé
              </button>
            </article>
          ))}
        </div>
      )}

      {ajout ? (
        <div className="card mt-2">
          <label htmlFor="zone" className="eyebrow mb-[7px] block">
            Zone concernée
          </label>
          <input
            id="zone"
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            placeholder="genou droit, épaule gauche…"
            className="field"
          />
          <label htmlFor="descr" className="eyebrow mb-[7px] block">
            Précision
          </label>
          <input
            id="descr"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="depuis quand, ce qui déclenche"
            className="field"
          />
          <div className="flex gap-2">
            <Button
              small
              disabled={enCours || zone.trim() === ''}
              onClick={() =>
                lancer(async () => {
                  const r = await ajouterLimitation({ zone, description })
                  if (r.ok) {
                    setZone('')
                    setDescription('')
                    setAjout(false)
                  }
                  return r
                })
              }
            >
              Déclarer
            </Button>
            <Button variant="ghost" small onClick={() => setAjout(false)} disabled={enCours}>
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAjout(true)}
          className="mt-2 w-full rounded-[11px] border border-line px-3 py-2.5 text-[12.5px] text-mut active:bg-[rgb(255_255_255/0.05)]"
        >
          Déclarer une gêne
        </button>
      )}

      {erreur && (
        <p className="mt-2 rounded-[11px] border border-bad/40 bg-bad/10 p-3 text-[12.5px] leading-relaxed text-text">
          {erreur}
        </p>
      )}

      {/*
        Les antecedents, replies. Ils ne pesent plus sur le programme mais ils
        expliquent une histoire — et permettent de rouvrir ce qu'on a clos
        trop vite, ce qui arrive plus souvent qu'on ne croit.
      */}
      {closes.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer list-none text-[12px] text-dim">
            {closes.length} antécédent{closes.length > 1 ? 's' : ''}
          </summary>
          <div className="mt-2 flex flex-col gap-1.5">
            {closes.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between gap-3 rounded-[12px] border border-line px-3 py-2.5"
              >
                <span className="min-w-0 text-[12.5px] text-mut">
                  {l.zone} · clos le {l.endedOn ? formatJour(l.endedOn) : '—'}
                </span>
                <button
                  type="button"
                  disabled={enCours}
                  onClick={() => lancer(() => rouvrirLimitation(l.id))}
                  className="shrink-0 text-[12px] text-dim disabled:opacity-40"
                >
                  Rouvrir
                </button>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  )
}
