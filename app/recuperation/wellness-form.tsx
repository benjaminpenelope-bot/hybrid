'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { NumPad, Scale } from '@/components/ui/numpad'
import { todayISO } from '@/lib/engine/date'
import type { Wellness } from '@/lib/engine/types'
import { submitOrQueue } from '@/lib/offline/client'
import { saveWellness } from './actions'

export function WellnessForm({ existing }: { existing: Wellness | null }) {
  const router = useRouter()
  const [sleep, setSleep] = useState(existing?.sleep ?? 7)
  const [fatigue, setFatigue] = useState<number | null>(existing?.fatigue ?? null)
  const [motivation, setMotivation] = useState<number | null>(existing?.motivation ?? null)
  const [soreness, setSoreness] = useState(existing?.soreness ?? '')
  const [restingHr, setRestingHr] = useState(existing?.restingHr ?? 0)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [queued, setQueued] = useState(false)

  const submit = async () => {
    setBusy(true)
    setError(null)
    const payload = {
      sleep,
      fatigue,
      motivation,
      soreness: soreness.trim() === '' ? null : soreness.trim(),
      restingHr: restingHr > 0 ? restingHr : null,
    }
    // Un seul relevé par jour : l'identifiant porte la date, donc renvoyer le
    // formulaire hors ligne écrase l'entrée en file au lieu d'en créer une autre.
    const result = await submitOrQueue('wellness', `wellness-${todayISO()}`, payload, () =>
      saveWellness(payload),
    )
    setBusy(false)
    if (!result.ok) setError(result.message ?? 'Enregistrement impossible.')
    else {
      setSaved(true)
      setQueued(result.queued)
      router.refresh()
    }
  }

  return (
    <div className="card">
      <NumPad label="Heures de sommeil" value={sleep} onChange={setSleep} unit="h" step={0.5} />
      <Scale
        label="Fatigue"
        value={fatigue}
        onChange={(v) => {
          setFatigue(v)
          setSaved(false)
        }}
        hint="1 = frais · 10 = vidé."
      />
      <Scale
        label="Motivation"
        value={motivation}
        onChange={(v) => {
          setMotivation(v)
          setSaved(false)
        }}
      />
      <NumPad
        label="FC au repos"
        value={restingHr}
        onChange={setRestingHr}
        unit="bpm"
        hint="Laisse à 0 si tu ne la mesures pas."
      />

      <div className="mb-4">
        <label htmlFor="courbatures" className="eyebrow mb-[7px] block">
          Courbatures ou douleurs
        </label>
        <input
          id="courbatures"
          value={soreness}
          onChange={(e) => {
            setSoreness(e.target.value)
            setSaved(false)
          }}
          placeholder="ex : mollets, tendon d'Achille gauche"
          className="w-full rounded-[11px] border border-line2 bg-bg2 px-[13px] py-3 text-base text-text outline-none focus:border-mut"
        />
      </div>

      {error && (
        <p className="mb-3 rounded-[11px] border border-bad/40 bg-bad/10 p-3 text-[12.5px] leading-relaxed text-text">
          {error}
        </p>
      )}

      {queued && (
        <p className="mb-3 rounded-[11px] border border-warn/40 bg-warn/10 p-3 text-[12.5px] leading-relaxed text-text">
          Gardé sur l&apos;appareil, faute de réseau. Tant que ce relevé n&apos;est pas parti, il
          ne compte pas dans ta récupération.
        </p>
      )}

      <Button onClick={submit} disabled={busy}>
        {busy ? 'Enregistrement…' : queued ? 'En attente de réseau' : saved ? 'Enregistré' : 'Enregistrer'}
      </Button>

      <p className="mt-3 text-[11.5px] leading-relaxed text-dim">
        Cette application ne pose aucun diagnostic. Une douleur inhabituelle, qui augmente à
        l&apos;effort ou dure plus de quelques jours, doit t&apos;amener à réduire ou arrêter
        l&apos;activité concernée, et à consulter un professionnel de santé.
      </p>
    </div>
  )
}
