'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { genererJetonImport } from './ingest-actions'

/**
 * IMPORT AUTOMATIQUE
 *
 * Un site web ne peut pas lire HealthKit : Apple le réserve aux applications
 * natives. Aucun serveur n'ira donc chercher des pas dans un iPhone — c'est
 * au téléphone d'envoyer.
 *
 * Ce bloc donne de quoi le faire : une adresse, un jeton, et la recette du
 * raccourci. Le jeton n'apparaît qu'une fois, à sa création : le serveur n'en
 * garde que l'empreinte, et le montrer à nouveau supposerait de l'avoir gardé
 * en clair.
 */
export function ImportAuto({
  adresse,
  jetonExiste,
  dernierEnvoi,
}: {
  adresse: string
  jetonExiste: boolean
  dernierEnvoi: string | null
}) {
  const [jeton, setJeton] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [copie, setCopie] = useState<string | null>(null)
  const [enCours, demarrer] = useTransition()

  const copier = (texte: string, quoi: string) => {
    void navigator.clipboard?.writeText(texte).then(
      () => {
        setCopie(quoi)
        setTimeout(() => setCopie(null), 1600)
      },
      () => setErreur('Copie impossible sur ce navigateur. Sélectionne le texte à la main.'),
    )
  }

  return (
    <div className="card">
      <p className="text-[13px] leading-relaxed text-mut">
        Ton téléphone envoie tes pas, tes pesées et tes séances chaque jour, sans que tu aies
        rien à faire. C&rsquo;est lui qui pousse : un site web ne peut pas lire Santé, Apple le
        réserve aux applications installées. Rien ne dépend d&rsquo;une plateforme tierce —
        n&rsquo;importe quel outil sachant envoyer du JSON alimente ton programme.
      </p>

      {dernierEnvoi && (
        <p className="mt-2.5 rounded-[11px] border border-ok/35 bg-ok/10 p-3 text-[12.5px] leading-relaxed text-text">
          Dernier envoi reçu le {dernierEnvoi}.
        </p>
      )}

      <div className="mt-4">
        <p className="eyebrow mb-1.5">Adresse d&rsquo;envoi</p>
        <button
          type="button"
          onClick={() => copier(adresse, 'adresse')}
          className="w-full break-all rounded-[11px] border border-line bg-bg2 px-3 py-2.5 text-left font-mono text-[12px] text-mut active:bg-[rgb(255_255_255/0.05)]"
        >
          {adresse}
        </button>
      </div>

      <div className="mt-4">
        <p className="eyebrow mb-1.5">Jeton</p>
        {jeton ? (
          <>
            <button
              type="button"
              onClick={() => copier(jeton, 'jeton')}
              className="w-full break-all rounded-[11px] border border-warn/40 bg-warn/10 px-3 py-2.5 text-left font-mono text-[12px] text-text"
            >
              {jeton}
            </button>
            <p className="mt-2 text-[11.5px] leading-relaxed text-warn">
              Copie-le maintenant : il ne sera plus jamais affiché. Le serveur n&rsquo;en garde que
              l&rsquo;empreinte, de quoi le reconnaître sans pouvoir le relire.
            </p>
          </>
        ) : (
          <p className="text-[12.5px] leading-relaxed text-dim">
            {jetonExiste
              ? 'Un jeton existe déjà. En générer un nouveau révoque le précédent — utile si un téléphone est perdu.'
              : 'Aucun jeton pour l’instant.'}
          </p>
        )}
      </div>

      <Button
        variant={jeton ? 'ghost' : 'solid'}
        small
        disabled={enCours}
        className="mt-3"
        onClick={() =>
          demarrer(async () => {
            setErreur(null)
            const r = await genererJetonImport()
            if (r.ok) setJeton(r.jeton)
            else setErreur(r.message)
          })
        }
      >
        {enCours ? 'Génération…' : jetonExiste ? 'Générer un nouveau jeton' : 'Générer un jeton'}
      </Button>

      {copie && <p className="mt-2 text-[12px] text-ok">{copie === 'jeton' ? 'Jeton copié.' : 'Adresse copiée.'}</p>}
      {erreur && (
        <p className="mt-2 rounded-[11px] border border-bad/40 bg-bad/10 p-3 text-[12.5px] leading-relaxed text-text">
          {erreur}
        </p>
      )}

      {/*
        La recette, repliee. Elle est indispensable et longue : depliee, elle
        pousserait le bouton qui la precede hors de l'ecran, et personne ne
        lit un mode d'emploi avant d'avoir le jeton.
      */}
      {/*
        Le raccourci pret a importer. Il ne contient aucun jeton — ce fichier
        est servi publiquement, un jeton dedans donnerait a n'importe qui de
        quoi ecrire dans le compte. Il le demande a l'import.
      */}
      <a
        href="/raccourci/hybrid-pas.shortcut"
        download
        className="mt-3 block w-full rounded-[11px] border border-line px-3 py-2.5 text-center text-[12.5px] text-mut active:bg-[rgb(255_255_255/0.05)]"
      >
        Télécharger le raccourci iOS
      </a>
      <p className="mt-2 text-[11.5px] leading-relaxed text-dim">
        À ouvrir depuis l&rsquo;iPhone. Il demande ton jeton à l&rsquo;import et fait tout le
        reste : la date, le corps JSON, l&rsquo;en-tête, l&rsquo;envoi. Une seule chose reste à
        faire une fois — remplacer l&rsquo;action <b className="text-mut">Demander une entrée</b>
        par <b className="text-mut">Santé → Obtenir un échantillon</b>, réglée sur
        <b className="text-mut"> Pas · Aujourd&rsquo;hui · Total</b>. Puis déclenche-le chaque
        soir depuis <b className="text-mut">Automatisation</b>.
      </p>

      <details className="mt-4">
        <summary className="cursor-pointer list-none text-[12.5px] text-mut">
          Le monter à la main, si le fichier ne passe pas
        </summary>
        <ol className="mt-2.5 flex list-decimal flex-col gap-2 pl-4 text-[12.5px] leading-relaxed text-mut">
          <li>
            Ouvre l&rsquo;app <b className="text-text">Raccourcis</b>, crée un raccourci, ajoute
            l&rsquo;action <b className="text-text">Obtenir un échantillon de santé</b> : type
            <b className="text-text"> Pas</b>, période <b className="text-text">Aujourd&rsquo;hui</b>,
            calcul <b className="text-text">Total</b>.
          </li>
          <li>
            Ajoute <b className="text-text">Obtenir le contenu de l&rsquo;URL</b> sur
            l&rsquo;adresse ci-dessus, méthode <b className="text-text">POST</b>.
          </li>
          <li>
            En-tête : <span className="font-mono text-[11.5px]">Authorization</span> avec la valeur
            <span className="font-mono text-[11.5px]"> Bearer </span> suivie de ton jeton.
          </li>
          <li>
            Corps <b className="text-text">JSON</b> :{' '}
            <span className="font-mono text-[11.5px]">
              {'{ "pas": [ { "date": "<date du jour>", "pas": <total> } ] }'}
            </span>
          </li>
          <li>
            Pour envoyer aussi une séance, ajoute une entrée{' '}
            <span className="font-mono text-[11.5px]">seances</span> :{' '}
            <span className="font-mono text-[11.5px]">
              {'{ "date": "…", "discipline": "run", "minutes": 42, "metres": 8000 }'}
            </span>
            . Les disciplines acceptées sont{' '}
            <span className="font-mono text-[11.5px]">run</span>,{' '}
            <span className="font-mono text-[11.5px]">bike</span>,{' '}
            <span className="font-mono text-[11.5px]">swim</span> et{' '}
            <span className="font-mono text-[11.5px]">strength</span>. Une séance envoyée se
            rapproche d&rsquo;abord de celle qui était prévue ce jour-là : elle la valide au lieu
            d&rsquo;en créer une seconde.
          </li>
          <li>
            Dans <b className="text-text">Automatisation</b>, déclenche-le tous les jours à 23 h.
            Renvoyer deux fois la même journée ne crée pas de doublon : la dernière valeur
            remplace la précédente.
          </li>
        </ol>
        <p className="mt-2.5 text-[12px] leading-relaxed text-dim">
          Une application d&rsquo;export automatique fait la même chose sans raccourci, du moment
          qu&rsquo;elle sait envoyer du JSON à une adresse avec un en-tête. Sur Android, la même
          recette s&rsquo;écrit avec un automatiseur de tâches. Le ressenti reste à saisir dans
          l&rsquo;app : aucun appareil ne le mesure, et le déduire d&rsquo;une fréquence cardiaque
          serait l&rsquo;inventer.
        </p>
      </details>
    </div>
  )
}
