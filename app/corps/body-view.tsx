'use client'

import { fr } from '@/lib/ui/nombre'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import { NumPad } from '@/components/ui/numpad'
import { Stat } from '@/components/ui/stat'
import { daysBetween, formatDate, todayISO } from '@/lib/engine/date'
import type { Measurement, Profile, WeightEntry } from '@/lib/engine/types'
import { submitOrQueue } from '@/lib/offline/client'
import { deletePhoto, saveMeasurement, saveWeight, uploadPhoto } from './actions'

interface Props {
  profile: Profile
  weights: WeightEntry[]
  measures: Measurement[]
  photos: { date: string; url: string | null; path: string }[]
  /** Vitesse de prise sur les 28 derniers jours, null si non calculable. */
  rate: number | null
  weekly: { date: string; kg: number }[]
}

/** En dessous, un avant / après ne montre que la lumière et la posture. */
const COMPARE_DAYS = 21

const MEASURE_LABELS: { key: keyof Omit<Measurement, 'date'>; label: string }[] = [
  { key: 'waist', label: 'Tour de taille' },
  { key: 'chest', label: 'Tour de poitrine' },
  { key: 'arm', label: 'Tour de bras' },
  { key: 'thigh', label: 'Tour de cuisse' },
]

export function BodyView({ profile, weights, measures, photos, rate, weekly }: Props) {
  const router = useRouter()
  const current = weights[weights.length - 1]?.kg ?? profile.startWeight
  const [kg, setKg] = useState(current)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [measure, setMeasure] = useState<Record<string, string>>({})
  const first = measures[0]
  const last = measures[measures.length - 1]

  const act = async (fn: () => Promise<{ ok: boolean; message?: string }>) => {
    setBusy(true)
    setError(null)
    const result = await fn()
    setBusy(false)
    if (!result.ok) setError(result.message ?? 'Enregistrement impossible.')
    else router.refresh()
  }

  const num = (v: string | undefined): number | null => {
    if (!v || v.trim() === '') return null
    const n = Number(v.replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }

  const firstPhoto = photos[0]
  const lastPhoto = photos[photos.length - 1]
  const gap = firstPhoto && lastPhoto ? daysBetween(firstPhoto.date, lastPhoto.date) : 0
  const comparable = photos.length >= 2 && gap >= COMPARE_DAYS

  const gain = current - profile.startWeight
  const target = profile.goalWeight - profile.startWeight
  const tooFast = rate !== null && rate > 0.25

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Poids actuel" value={fr(current)} sub="kg" />
        <Stat
          label="Objectif"
          value={fr(profile.goalWeight)}
          sub={`${gain >= 0 ? '+' : ''}${fr(gain)} kg parcourus sur ${fr(target)}`}
        />
      </div>

      {rate !== null && (
        <div
          className="mt-2.5 rounded-card border p-3"
          style={{
            borderColor: tooFast ? 'var(--warn)' : 'var(--line)',
            background: tooFast ? 'rgba(224,167,60,0.1)' : 'var(--card)',
          }}
        >
          <div className="flex items-baseline justify-between">
            <span className="eyebrow">Vitesse de prise</span>
            <span className="num text-[18px]" style={{ color: tooFast ? 'var(--warn)' : 'var(--text)' }}>
              {rate >= 0 ? '+' : ''}
              {rate.toFixed(2)} kg/sem
            </span>
          </div>
          {tooFast && (
            <p className="mt-2 text-[12.5px] leading-relaxed text-text">
              Au-delà de 0,25 kg par semaine, la prise se fait surtout en gras. Réduis
              l&apos;excédent calorique et garde les protéines.
            </p>
          )}
        </div>
      )}

      <div className="colonnes mt-2.5">
      {weights.length > 1 && (
        <div className="card mt-2.5">
          <div className="eyebrow mb-2">Évolution</div>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={weights}>
              <defs>
                <linearGradient id="poids" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--text)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--text)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fill: 'var(--dim)', fontSize: 9 }}
                tickFormatter={(d: string) => formatDate(d).slice(4)}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={['dataMin - 1', 'dataMax + 1']}
                tick={{ fill: 'var(--dim)', fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--card-hi)',
                  border: '1px solid var(--line2)',
                  borderRadius: 10,
                  fontSize: 12,
                }}
                labelFormatter={(d: string) => formatDate(d)}
                formatter={(v: number) => [`${v} kg`, 'Poids']}
              />
              <ReferenceLine
                y={profile.goalWeight}
                stroke="var(--ok)"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              <Area
                type="monotone"
                dataKey="kg"
                stroke="var(--text)"
                strokeWidth={2}
                fill="url(#poids)"
              />
            </AreaChart>
          </ResponsiveContainer>
          {weekly.length > 1 && (
            <p className="mt-1 text-[11px] leading-relaxed text-dim">
              Moyenne hebdomadaire :{' '}
              {weekly.map((w) => `${fr(w.kg)}`).join(' → ')} kg. La ligne verte est ton
              objectif.
            </p>
          )}
        </div>
      )}

      <section className="mt-6">
        <h2 className="eyebrow mb-2.5">Nouvelle pesée</h2>
        <div className="card">
          <NumPad label="Poids du jour" value={kg} onChange={setKg} unit="kg" step={0.1} />
          <Button
            onClick={() =>
              // La pesée est la seule saisie du corps qui survit hors ligne :
              // les mesures et les photos demandent un aller-retour au serveur.
              act(() =>
                submitOrQueue('weight', `poids-${todayISO()}`, kg, () => saveWeight(kg)),
              )
            }
            disabled={busy}
          >
            Enregistrer la pesée
          </Button>
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-2.5 flex items-baseline justify-between">
          <h2 className="eyebrow">Mensurations</h2>
          <span className="num text-[11px] text-dim">{measures.length} relevé(s)</span>
        </div>

        {measures.length > 0 && (
          <div className="card mb-2.5 divide-y divide-line py-0">
            {MEASURE_LABELS.map(({ key, label }) => {
              const start = first?.[key] ?? null
              const now = last?.[key] ?? null
              if (now === null) return null
              const diff = start !== null && measures.length > 1 ? now - start : null
              return (
                <div key={key} className="flex items-center justify-between py-3">
                  <span className="text-[13px] text-mut">{label}</span>
                  <span className="flex items-baseline gap-2.5">
                    <span className="num text-[15px]">{now} cm</span>
                    {diff !== null && diff !== 0 && (
                      <span className="num text-[11.5px] text-dim">
                        {diff > 0 ? '+' : ''}
                        {fr(diff)}
                      </span>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        <div className="card">
          <div className="grid grid-cols-2 gap-2">
            {MEASURE_LABELS.map(({ key, label }) => (
              <label key={key} className="block">
                <span className="eyebrow mb-1 block text-[9.5px]">{label}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  placeholder="cm"
                  value={measure[key] ?? ''}
                  onChange={(e) => setMeasure({ ...measure, [key]: e.target.value })}
                  className="num field"
                />
              </label>
            ))}
          </div>
          <Button
            variant="ghost"
            small
            className="mt-3"
            disabled={busy}
            onClick={() =>
              act(() =>
                saveMeasurement({
                  waist: num(measure.waist),
                  chest: num(measure.chest),
                  arm: num(measure.arm),
                  thigh: num(measure.thigh),
                }),
              )
            }
          >
            Enregistrer les mensurations
          </Button>
          <p className="mt-2 text-[11.5px] leading-relaxed text-dim">
            Laisse vide ce que tu ne mesures pas : une case vide reste non mesurée.
          </p>
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-2.5 flex items-baseline justify-between">
          <h2 className="eyebrow">Photos de progression</h2>
          <span className="num text-[11px] text-dim">{photos.length}</span>
        </div>

        {comparable && firstPhoto?.url && lastPhoto?.url && (
          <div className="mb-2.5">
            <div className="grid grid-cols-2 gap-2">
              {[firstPhoto, lastPhoto].map((p, i) => (
                <figure key={p.path} className="overflow-hidden rounded-card border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url ?? ''} alt={`Photo du ${formatDate(p.date)}`} className="w-full" />
                  <figcaption className="bg-card px-2 py-1.5 text-[11px] text-dim">
                    {i === 0 ? 'Avant' : 'Après'} · {formatDate(p.date)}
                  </figcaption>
                </figure>
              ))}
            </div>
            <p className="mt-1.5 text-[11.5px] text-dim">
              {gap} jours d&apos;écart entre les deux.
            </p>
          </div>
        )}

        {photos.length > 0 && (
          <ul className="mb-2.5 flex flex-col gap-2">
            {photos.map((p) => (
              <li
                key={p.path}
                className="flex items-center gap-3 rounded-card border border-line bg-card p-2"
              >
                {p.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.url}
                    alt={`Photo du ${formatDate(p.date)}`}
                    className="h-14 w-14 shrink-0 rounded-[9px] object-cover"
                  />
                )}
                <span className="flex-1 text-[13px]">{formatDate(p.date)}</span>
                <button
                  type="button"
                  onClick={() => act(() => deletePhoto(p.path))}
                  disabled={busy}
                  aria-label={`Supprimer la photo du ${formatDate(p.date)}`}
                  className="h-11 w-11 shrink-0 rounded-[9px] border border-line2 text-[15px] text-bad"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        {photos.length >= 2 && !comparable && (
          <p className="mb-2.5 text-[11.5px] leading-relaxed text-dim">
            Le comparateur avant / après apparaît dès que deux photos sont séparées d&apos;au
            moins {COMPARE_DAYS} jours. En dessous, la comparaison ne montrerait que la lumière et
            la posture.
          </p>
        )}

        <form
          action={async (formData) => {
            await act(() => uploadPhoto(formData))
          }}
          className="card"
        >
          <label htmlFor="photo" className="eyebrow mb-[7px] block">
            Ajouter une photo
          </label>
          <input
            id="photo"
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            className="w-full rounded-[11px] border border-line2 bg-bg2 px-3 py-3 text-[13px] text-mut file:mr-3 file:rounded-[8px] file:border-0 file:bg-line2 file:px-3 file:py-1.5 file:text-[12px] file:text-text"
          />
          <Button type="submit" variant="ghost" small className="mt-3" disabled={busy}>
            Envoyer
          </Button>
          <p className="mt-2 text-[11.5px] leading-relaxed text-dim">
            Stockage privé : tes photos ne sont lisibles que par toi, via un lien signé valable
            une heure.
          </p>
        </form>
      </section>

      </div>
      {error && (
        <p className="mt-4 rounded-[11px] border border-bad/40 bg-bad/10 p-3 text-[12.5px] leading-relaxed text-text">
          {error}
        </p>
      )}
    </>
  )
}
