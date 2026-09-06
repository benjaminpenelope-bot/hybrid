'use client'

import { useState } from 'react'

/**
 * ABONNEMENT CALENDRIER
 *
 * Un lien, et rien d'autre à faire. Le téléphone relit l'adresse plusieurs
 * fois par jour, donc une séance déplacée le matin est à jour l'après-midi —
 * et la montre, qui affiche l'agenda du téléphone, suit sans qu'aucune
 * plateforme n'ait à nous ouvrir son interface.
 *
 * `webcal://` plutôt que `https://` : c'est le schéma qui déclenche
 * l'abonnement plutôt que le téléchargement. Les deux adressent le même
 * fichier ; seul le geste du téléphone change.
 */
export function Calendrier({ adresse }: { adresse: string }) {
  const [copie, setCopie] = useState(false)
  const webcal = adresse.replace(/^https?:/, 'webcal:')

  return (
    <div className="card">
      <p className="text-[13px] leading-relaxed text-mut">
        Ton programme dans le calendrier du téléphone — donc au poignet, sur toute montre qui
        affiche l&rsquo;agenda. Ce n&rsquo;est pas un export : c&rsquo;est un abonnement. Une
        séance déplacée ici se déplace là-bas, sans rien réimporter.
      </p>

      <a
        href={webcal}
        className="btn mt-4 w-full"
      >
        S&rsquo;abonner au calendrier
      </a>

      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(adresse).then(() => {
            setCopie(true)
            setTimeout(() => setCopie(false), 1600)
          })
        }}
        className="mt-2 w-full break-all rounded-[11px] border border-line bg-bg2 px-3 py-2.5 text-left font-mono text-[11.5px] text-mut active:bg-[rgb(255_255_255/0.05)]"
      >
        {adresse}
      </button>
      {copie && <p className="mt-2 text-[12px] text-ok">Adresse copiée.</p>}

      <p className="mt-3 text-[11.5px] leading-relaxed text-dim">
        Si le bouton n&rsquo;ouvre rien, copie l&rsquo;adresse et colle-la dans ton application de
        calendrier : <b className="text-mut">Ajouter un calendrier par abonnement</b> sur iPhone,{' '}
        <b className="text-mut">Autres agendas → À partir de l&rsquo;URL</b> sur Google Agenda. Le
        lien te concerne seul et donne accès en lecture à ton programme : ne le partage pas.
      </p>
    </div>
  )
}
