'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { CONFIRMATION_SUPPRESSION } from '@/lib/validation/compte'
import { demanderExport, demanderSuppression } from './compte-actions'

/**
 * MES DONNÉES
 *
 * Les deux droits que le RGPD accorde : récupérer ses données, faire effacer
 * son compte. Ils étaient absents.
 *
 * La suppression demande de recopier un mot plutôt que de cocher une case :
 * une case se coche par réflexe, et l'action est définitive.
 */
export function MesDonnees() {
  const [exportEnCours, exporter] = useTransition()
  const [suppressionEnCours, supprimer] = useTransition()
  const [erreur, setErreur] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState('')
  const [ouvert, setOuvert] = useState(false)

  const telecharger = () => {
    setErreur(null)
    exporter(async () => {
      const r = await demanderExport()
      if (!r.ok || !r.contenu || !r.fichier) {
        setErreur(r.message ?? 'Export impossible.')
        return
      }
      /*
       * Le fichier est construit dans le navigateur a partir de la reponse :
       * il n'est ecrit nulle part sur le serveur, donc rien ne traine.
       */
      const url = URL.createObjectURL(new Blob([r.contenu], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = r.fichier
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  const effacer = () => {
    setErreur(null)
    supprimer(async () => {
      // En cas de succes l'action redirige : seul un echec revient ici.
      const r = await demanderSuppression(confirmation)
      setErreur(r.message)
    })
  }

  return (
    <div className="card">
      <h3 className="text-[14px]">Mes données</h3>

      <p className="mt-2 text-[12.5px] leading-relaxed text-mut">
        Tout ce que l&apos;app enregistre sur toi t&apos;appartient : séances, pesées, mesures,
        ressentis, repères, objectifs et échanges avec le coach.
      </p>

      <Button onClick={telecharger} disabled={exportEnCours} variant="ghost" className="mt-3">
        {exportEnCours ? 'Préparation…' : 'Télécharger mes données'}
      </Button>

      <p className="mt-2 text-[11.5px] leading-relaxed text-mut">
        Un fichier JSON, lisible et complet. Les jetons de connexion Strava en sont exclus : ils
        sont chiffrés et n&apos;auraient aucun sens hors du serveur.
      </p>

      <div className="mt-5 border-t border-line pt-4">
        {!ouvert ? (
          <button
            type="button"
            onClick={() => setOuvert(true)}
            className="text-[12.5px] text-bad underline"
          >
            Supprimer mon compte
          </button>
        ) : (
          <>
            <h4 className="text-[13px] text-bad">Supprimer mon compte</h4>
            <p className="mt-2 text-[12.5px] leading-relaxed text-mut">
              Tout est effacé : ton historique, tes photos, tes repères. C&apos;est définitif et
              rien ne permettra de revenir en arrière. Pense à télécharger tes données avant.
            </p>

            <label htmlFor="confirmation" className="eyebrow mb-[7px] mt-4 block">
              Recopie {CONFIRMATION_SUPPRESSION} pour confirmer
            </label>
            <input
              id="confirmation"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              autoComplete="off"
              className="w-full rounded-[11px] border border-line2 bg-bg2 px-[13px] py-3 text-base text-text outline-none focus:border-bad"
            />

            <div className="mt-3 flex gap-2">
              <Button
                onClick={effacer}
                disabled={suppressionEnCours || confirmation.trim() !== CONFIRMATION_SUPPRESSION}
                className="border-bad text-bad"
                variant="ghost"
              >
                {suppressionEnCours ? 'Suppression…' : 'Supprimer définitivement'}
              </Button>
              <Button
                onClick={() => {
                  setOuvert(false)
                  setConfirmation('')
                  setErreur(null)
                }}
                variant="ghost"
              >
                Annuler
              </Button>
            </div>
          </>
        )}
      </div>

      {erreur && (
        <p className="mt-3 rounded-[11px] border border-bad/40 bg-bad/10 p-3 text-[12.5px] leading-relaxed text-text">
          {erreur}
        </p>
      )}
    </div>
  )
}
