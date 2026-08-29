'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  analyser,
  decouper,
  extractionVide,
  peseesParJour,
  seancesUniques,
  type Extraction,
} from '@/lib/health/parse'
import { importHealth, type ResultatHealth } from './health-actions'

/**
 * Import d'un export Apple Health.
 *
 * Le fichier est lu en flux dans le navigateur et n'est jamais téléversé :
 * `export.xml` pèse souvent des centaines de mégaoctets et contient bien plus
 * que de l'entraînement — cycles, symptômes, notes médicales. Rien de tout
 * cela n'a de raison de traverser le réseau. Seules les pesées et les séances
 * retenues partent au serveur.
 */
export function HealthImport() {
  const input = useRef<HTMLInputElement>(null)
  const [etape, setEtape] = useState<'attente' | 'lecture' | 'envoi'>('attente')
  const [lus, setLus] = useState(0)
  const [erreur, setErreur] = useState<string | null>(null)
  const [resultat, setResultat] = useState<ResultatHealth | null>(null)
  const [ignores, setIgnores] = useState<[string, number][]>([])

  const traiter = async (fichier: File) => {
    setErreur(null)
    setResultat(null)
    setIgnores([])
    setLus(0)
    setEtape('lecture')

    const extraction: Extraction = extractionVide()

    try {
      const lecteur = fichier.stream().pipeThrough(new TextDecoderStream()).getReader()
      let queue = ''
      let octets = 0

      for (;;) {
        const { done, value } = await lecteur.read()
        if (done) break

        octets += value.length
        const { pret, queue: reste } = decouper(queue + value)
        queue = reste
        if (pret !== '') analyser(pret, extraction)

        // Un rendu par mégaoctet suffit : plus souvent, l'affichage coûte
        // plus cher que la lecture elle-même.
        if (octets > 1_000_000) {
          setLus((n) => n + octets)
          octets = 0
          await new Promise((r) => setTimeout(r, 0))
        }
      }

      // La queue restante peut contenir une dernière balise fermée.
      if (queue !== '') analyser(queue, extraction)
    } catch {
      setEtape('attente')
      setErreur("Lecture du fichier impossible. Vérifie qu'il s'agit bien de export.xml.")
      return
    }

    const pesees = peseesParJour(extraction.pesees)
    const seances = seancesUniques(extraction.seances).map(({ hr: _hr, ...s }) => s)
    setIgnores([...extraction.ignores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4))

    if (pesees.length === 0 && seances.length === 0) {
      setEtape('attente')
      setErreur(
        "Aucune pesée ni séance suivie dans ce fichier. Hybrid ne lit que la masse corporelle, la course, la natation et le renforcement.",
      )
      return
    }

    setEtape('envoi')
    setResultat(await importHealth({ pesees, seances }))
    setEtape('attente')
    if (input.current) input.current.value = ''
  }

  const occupe = etape !== 'attente'

  return (
    <div className="card">
      <p className="text-[13px] leading-relaxed text-mut">
        Sur iPhone : <b className="text-text">Santé</b> → ton portrait →{' '}
        <b className="text-text">Exporter toutes les données</b>. Dépose ensuite le fichier{' '}
        <code className="num text-[12px]">export.xml</code> ici.
      </p>

      <p className="mt-2.5 text-[12.5px] leading-relaxed text-dim">
        Le fichier est lu sur cet appareil et n&apos;est jamais envoyé. Seules les pesées et les
        séances de course, natation et renforcement en sortent. Le reste de ton dossier Santé ne
        quitte pas ton téléphone.
      </p>

      <input
        ref={input}
        type="file"
        accept=".xml,text/xml,application/xml"
        disabled={occupe}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void traiter(f)
        }}
        className="mt-3.5 w-full text-[12.5px] text-mut file:mr-3 file:rounded-[9px] file:border file:border-line2 file:bg-bg2 file:px-3 file:py-2 file:font-display file:text-[11px] file:uppercase file:tracking-[0.1em] file:text-text"
      />

      {etape === 'lecture' && (
        <p className="num mt-3 text-[12px] text-mut">
          Lecture… {Math.round(lus / 1_000_000)} Mo analysés
        </p>
      )}
      {etape === 'envoi' && <p className="num mt-3 text-[12px] text-mut">Enregistrement…</p>}

      {erreur && (
        <p className="mt-3 rounded-[11px] border border-bad/40 bg-bad/10 p-3 text-[12.5px] leading-relaxed text-text">
          {erreur}
        </p>
      )}

      {resultat && (
        <div className="mt-3 rounded-[11px] border border-line bg-bg2 p-3">
          {resultat.ok ? (
            <>
              <p className="text-[12.5px] leading-relaxed text-text">
                {resultat.pesees} pesée(s) et {resultat.seances} séance(s) enregistrées.
              </p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-warn">
                Health ne mesure pas le ressenti. Les séances importées attendent ton RPE : tant
                qu&apos;il manque, leur charge repose sur une estimation.
              </p>
            </>
          ) : (
            <p className="text-[12.5px] leading-relaxed text-text">{resultat.message}</p>
          )}
        </div>
      )}

      {ignores.length > 0 && (
        <>
          <p className="eyebrow mt-3">Types non suivis rencontrés</p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {ignores.map(([type, n]) => (
              <li key={type} className="text-[12px] leading-relaxed text-dim">
                {type.replace('HKWorkoutActivityType', '')} · {n}
              </li>
            ))}
          </ul>
        </>
      )}

      <Button
        onClick={() => input.current?.click()}
        disabled={occupe}
        className="mt-4"
      >
        {occupe ? 'Traitement…' : 'Choisir le fichier'}
      </Button>
    </div>
  )
}
