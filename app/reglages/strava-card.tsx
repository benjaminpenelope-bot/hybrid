'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import type { ResultatImport } from '@/lib/strava/sync'
import { disconnectStrava, syncStrava } from './actions'

export function StravaCard({
  configure,
  connecte,
  athleteId,
  derniereSynchro,
}: {
  configure: boolean
  connecte: boolean
  athleteId: number | null
  derniereSynchro: string | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [erreur, setErreur] = useState<string | null>(null)
  const [resume, setResume] = useState<ResultatImport | null>(null)

  const lancer = (fn: () => Promise<{ ok: boolean; message?: string; resume?: ResultatImport }>) => {
    setErreur(null)
    setResume(null)
    startTransition(async () => {
      const r = await fn()
      if (!r.ok) setErreur(r.message ?? 'Opération impossible.')
      else {
        setResume(r.resume ?? null)
        router.refresh()
      }
    })
  }

  if (!configure) {
    return (
      <div className="card">
        <p className="text-[13px] leading-relaxed text-mut">
          <b className="text-text">Strava n&apos;est pas configuré sur ce serveur.</b> Il manque{' '}
          <code className="num text-[12px] text-warn">STRAVA_CLIENT_ID</code>,{' '}
          <code className="num text-[12px] text-warn">STRAVA_CLIENT_SECRET</code> ou{' '}
          <code className="num text-[12px] text-warn">TOKEN_ENCRYPTION_KEY</code>. Sans la clé de
          chiffrement, la connexion reste volontairement désactivée : des jetons Strava en clair
          en base donneraient accès à ton compte.
        </p>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: connecte ? 'var(--ok)' : 'var(--dim)' }}
            aria-hidden
          />
          <span className="dsp text-[16px]">{connecte ? 'Connecté' : 'Non connecté'}</span>
        </span>
        {athleteId !== null && <span className="num text-[12px] text-dim">#{athleteId}</span>}
      </div>

      <p className="mt-2.5 text-[12.5px] leading-relaxed text-mut">
        {connecte
          ? 'Tes nouvelles activités arrivent automatiquement. Une course renseigne la distance, la durée, le dénivelé et la fréquence cardiaque. Le ressenti reste à saisir : Strava ne le mesure pas.'
          : 'Athlete OS demande la lecture de tes activités, y compris privées. Aucun droit d’écriture : rien ne sera publié sur ton compte.'}
      </p>

      {connecte && derniereSynchro && (
        <p className="num mt-2 text-[12px] text-dim">Dernière synchro : {derniereSynchro}</p>
      )}

      {erreur && (
        <p className="mt-3 rounded-[11px] border border-bad/40 bg-bad/10 p-3 text-[12.5px] leading-relaxed text-text">
          {erreur}
        </p>
      )}

      {resume && <ResumeImport resume={resume} />}

      <div className="mt-4 flex flex-col gap-2">
        {connecte ? (
          <>
            <Button onClick={() => lancer(syncStrava)} disabled={pending}>
              {pending ? 'Synchronisation…' : 'Synchroniser les 30 derniers jours'}
            </Button>
            <button
              type="button"
              onClick={() => lancer(disconnectStrava)}
              disabled={pending}
              className="eyebrow text-dim"
            >
              Déconnecter Strava
            </button>
          </>
        ) : (
          <a
            href="/api/strava/connect"
            role="button"
            className="flex items-center justify-center rounded-[11px] bg-run px-4 font-display text-[13px] font-semibold uppercase tracking-[0.08em] text-bg"
          >
            Connecter Strava
          </a>
        )}
      </div>
    </div>
  )
}

function ResumeImport({ resume }: { resume: ResultatImport }) {
  const rien = resume.crees === 0 && resume.misAJour === 0

  return (
    <div className="mt-3 rounded-[11px] border border-line bg-bg2 p-3">
      <p className="text-[12.5px] leading-relaxed text-text">
        {rien
          ? 'Aucune activité nouvelle sur les 30 derniers jours.'
          : `${resume.misAJour} séance(s) renseignée(s), ${resume.crees} ajoutée(s) hors programme.`}
      </p>

      {resume.aCompleter > 0 && (
        <p className="mt-2 text-[12.5px] leading-relaxed text-warn">
          {resume.aCompleter} séance(s) attendent une saisie de ta part. Tant que le ressenti
          manque, leur charge repose sur une estimation et non sur une mesure.
        </p>
      )}

      {resume.ignores.length > 0 && (
        <>
          <p className="eyebrow mt-3">Écartées</p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {resume.ignores.slice(0, 5).map((i) => (
              <li key={i.stravaId} className="text-[12px] leading-relaxed text-dim">
                {i.raison}
              </li>
            ))}
            {resume.ignores.length > 5 && (
              <li className="text-[12px] text-dim">
                et {resume.ignores.length - 5} autre(s).
              </li>
            )}
          </ul>
        </>
      )}
    </div>
  )
}
