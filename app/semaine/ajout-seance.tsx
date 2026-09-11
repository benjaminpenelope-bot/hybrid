'use client'

import { teinte } from '@/lib/ui/session-meta'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { ChoixNombre, DureeMinSec, NumPad, Scale } from '@/components/ui/numpad'
import { pace } from '@/lib/engine/math'
import { zoneLabel, type ExerciseRef } from '@/lib/ui/exercises'
import { addPastSession } from './actions'

/** Une ligne du tableau de force : un mouvement, ses séries, ses répétitions. */
interface LigneExercice {
  /** Identifiant de ligne : deux fois le même mouvement reste possible. */
  uid: number
  key: string
  sets: number
  reps: number
}

/**
 * Ajout d'une séance déjà faite, à une date passée.
 *
 * Sert à rattraper ce qui a été fait avant l'installation de l'app, ou fait
 * sans l'ouvrir. Rien n'y est obligatoire sauf la discipline, la date et la
 * durée. Ce qui reste vide reste vide : une distance non renseignée n'est pas
 * une distance nulle, et elle sortira du calcul plutôt que de le fausser.
 */

const DISCIPLINES = [
  { kind: 'run' as const, label: 'Course', color: 'var(--run)', canal: '--run-c', titre: 'Course' },
  { kind: 'swim' as const, label: 'Natation', color: 'var(--swim)', canal: '--swim-c', titre: 'Natation' },
  { kind: 'strength' as const, label: 'Renfo', color: 'var(--street)', canal: '--street-c', titre: 'Renforcement' },
]

export function AjoutSeance({
  dateParDefaut,
  maxDate,
  exercices,
  onFerme,
  onEnregistre,
}: {
  dateParDefaut: string
  maxDate: string
  exercices: ExerciseRef[]
  onFerme: () => void
  onEnregistre: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [erreur, setErreur] = useState<string | null>(null)

  const [kind, setKind] = useState<'run' | 'swim' | 'strength'>('run')
  const [date, setDate] = useState(dateParDefaut > maxDate ? maxDate : dateParDefaut)
  const [titre, setTitre] = useState('')
  const [minutes, setMinutes] = useState(45)
  const [km, setKm] = useState(0)
  const [metres, setMetres] = useState(0)
  const [hr, setHr] = useState(0)
  const [elev, setElev] = useState(0)
  /** Les deux mesures de montre restent repliées : la plupart n'en ont pas. */
  const [detail, setDetail] = useState(false)
  const [lignes, setLignes] = useState<LigneExercice[]>([])
  const [rpe, setRpe] = useState<number | null>(null)
  const [note, setNote] = useState('')

  /*
   * L'allure, calculee en direct. C'est elle qui dit si les deux chiffres
   * saisis sont les bons : une erreur de distance ou de duree se voit
   * immediatement sur une allure absurde, jamais sur les nombres eux-memes.
   */
  const allure = km > 0 && minutes > 0 ? `${pace(minutes / km, 1)}/km` : '—'
  const allure100 = metres > 0 && minutes > 0 ? `${pace((minutes / metres) * 100, 1)}/100 m` : '—'

  const discipline = DISCIPLINES.find((d) => d.kind === kind)!
  const parKey = new Map(exercices.map((e) => [e.key, e]))

  /** Groupé par zone, pour retrouver un mouvement sans lire toute la liste. */
  const zones = ['haut', 'bas', 'gainage'] as const
  const parZone = zones
    .map((z) => ({ zone: z, items: exercices.filter((e) => e.zone === z) }))
    .filter((g) => g.items.length > 0)

  const ajouterLigne = () => {
    const premier = exercices[0]
    if (!premier) return
    setLignes((l) => [...l, { uid: Date.now() + l.length, key: premier.key, sets: 3, reps: 10 }])
  }

  const majLigne = (uid: number, champs: Partial<LigneExercice>) =>
    setLignes((l) => l.map((x) => (x.uid === uid ? { ...x, ...champs } : x)))

  const totalReps = lignes.reduce((a, l) => {
    const ex = parKey.get(l.key)
    return a + (ex?.unit === 'reps' ? l.sets * l.reps : 0)
  }, 0)

  const envoyer = () => {
    setErreur(null)
    startTransition(async () => {
      const r = await addPastSession({
        date,
        kind,
        title: titre.trim() === '' ? discipline.titre : titre.trim(),
        minutes,
        // Zéro veut dire « pas saisi » : on l'envoie comme absence, pas comme mesure.
        distance: kind === 'run' ? (km > 0 ? km : null) : kind === 'swim' ? (metres > 0 ? metres : null) : null,
        // Zero veut dire « pas mesure » : ni un coeur a l'arret, ni du plat.
        hr: hr > 0 ? Math.round(hr) : null,
        elev: kind === 'run' && elev > 0 ? Math.round(elev) : null,
        exercises:
          kind === 'strength'
            ? lignes.map((l) => ({
                key: l.key,
                name: parKey.get(l.key)?.name ?? l.key,
                sets: l.sets,
                reps: l.reps,
                unit: parKey.get(l.key)?.unit ?? 'reps',
              }))
            : [],
        rpe,
        note: note.trim() === '' ? null : note.trim(),
      })
      if (!r.ok) setErreur(r.message ?? 'Enregistrement impossible.')
      else onEnregistre()
    })
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end bg-bg/80 backdrop-blur-sm"
      role="dialog"
      aria-label="Ajouter une séance passée"
    >
      <div className="max-h-[88vh] w-full overflow-y-auto rounded-t-card border-t border-line bg-card p-4 pb-8">
        <div className="mx-auto w-full max-w-app">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <h2 className="dsp text-[20px] leading-tight">Séance passée</h2>
              <p className="mt-1 text-[12px] leading-relaxed text-dim">
                Elle comptera dans ton volume et ta charge. Ce que tu ne renseignes pas restera
                vide plutôt que d&apos;être deviné.
              </p>
            </div>
            <button type="button" onClick={onFerme} className="eyebrow shrink-0 text-dim">
              Fermer
            </button>
          </div>

          {/* Une rangee de pastilles, comme partout ailleurs : les cadres
              colores faisaient trois boutons de formulaire la ou il faut un
              choix immediat. */}
          <div className="mb-3.5 flex gap-1.5">
            {DISCIPLINES.map((d) => (
              <button
                key={d.kind}
                type="button"
                aria-pressed={kind === d.kind}
                onClick={() => setKind(d.kind)}
                className="min-h-[40px] flex-1 select-none rounded-full text-[13px] font-semibold tracking-[-0.01em] transition-[background-color,color,box-shadow] duration-200 active:scale-[0.97]"
                style={{
                  color: kind === d.kind ? d.color : 'var(--mut)',
                  background: kind === d.kind ? teinte(d.canal, 0.16) : 'rgb(255 255 255 / 0.04)',
                  boxShadow: kind === d.kind ? 'inset 0 1px 0 rgb(255 255 255 / 0.14)' : 'none',
                }}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* La date et le titre sur une rangee : deux champs courts qui
              occupaient deux blocs entiers. */}
          <div className="mb-3.5 flex gap-2">
            <label className="block w-[9.5rem] shrink-0">
              <span className="eyebrow mb-1.5 block">Date</span>
              <input
                type="date"
                value={date}
                max={maxDate}
                onChange={(e) => setDate(e.target.value)}
                className="field !mb-0"
              />
            </label>
            <label className="block min-w-0 flex-1">
              <span className="eyebrow mb-1.5 block">Titre</span>
              <input
                type="text"
                value={titre}
                placeholder={discipline.titre}
                maxLength={120}
                onChange={(e) => setTitre(e.target.value)}
                className="field !mb-0 placeholder:text-dim focus:border-mut"
              />
            </label>
          </div>

          {/*
            LES CHIFFRES, ET CE QU'ILS DONNENT.
            
            La duree se saisissait en minutes entieres, par pas de cinq : une
            sortie de 28'43" y devenait 28 ou 30, et l'allure passait de 5:24
            a 5:16 ou 4:59 au kilometre. Sur une seance qu'on rattrape de
            memoire on accepte l'approximation ; sur une seance qu'on recopie
            d'une montre, la perdre est absurde.
            
            L'allure s'affiche en direct sous les deux champs. C'est elle qui
            dit si les chiffres saisis sont les bons : une erreur de distance
            ou de duree se voit immediatement sur une allure absurde, jamais
            sur les nombres eux-memes.
          */}
          <div className="mb-3.5 rounded-card border border-line2 bg-bg2 p-3.5">
            <DureeMinSec label="Durée" value={minutes} onChange={setMinutes} />

            {kind === 'run' && (
              <NumPad label="Distance" value={km} onChange={setKm} unit="km" step={0.1} />
            )}
            {kind === 'swim' && (
              <ChoixNombre
                label="Distance totale"
                value={metres}
                onChange={setMetres}
                options={[500, 1000, 1500]}
                unit="m"
                step={25}
              />
            )}

            {kind !== 'strength' && (
              <div
                className="flex items-center justify-between rounded-[11px] px-3 py-2.5"
                style={{ background: teinte(discipline.canal, 0.08) }}
              >
                <span className="eyebrow">Allure</span>
                <span className="num text-[19px]" style={{ color: discipline.color }}>
                  {kind === 'run' ? allure : allure100}
                </span>
              </div>
            )}
          </div>

          {/*
            Les deux mesures que donne une montre. Repliees : la plupart des
            seances qu'on rattrape n'en ont pas, et deux champs vides de plus
            donnent a croire qu'on attend quelque chose.
          */}
          {detail ? (
            <div className="mb-3.5 rounded-card border border-line2 bg-bg2 p-3.5">
              <NumPad
                label="FC moyenne"
                value={hr}
                onChange={setHr}
                unit="bpm"
                step={1}
                hint="Laisse à 0 sans cardio : la donnée restera non mesurée plutôt que fausse."
              />
              {kind === 'run' && (
                <NumPad
                  label="Dénivelé positif"
                  value={elev}
                  onChange={setElev}
                  unit="m"
                  step={5}
                />
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setDetail(true)}
              className="mb-3.5 w-full rounded-[11px] border border-line px-3 py-2.5 text-[12.5px] text-mut active:bg-[rgb(255_255_255/0.05)]"
            >
              {kind === 'run' ? 'Ajouter la FC moyenne et le dénivelé' : 'Ajouter la FC moyenne'}
            </button>
          )}
          {kind === 'strength' && (
            <div className="mt-3">
              <div className="mb-2 flex items-baseline justify-between">
                <span className="eyebrow">Exercices</span>
                {totalReps > 0 && (
                  <span className="num text-[12px] text-mut">{totalReps} répétitions</span>
                )}
              </div>

              {exercices.length === 0 && (
                <p className="rounded-[11px] border border-warn/40 bg-warn/10 p-3 text-[12.5px] leading-relaxed text-text">
                  Le catalogue d&apos;exercices n&apos;est pas encore en base. Applique la
                  migration, sinon la séance serait enregistrée sans savoir ce qui a travaillé.
                </p>
              )}

              {lignes.map((l) => {
                const ex = parKey.get(l.key)
                return (
                  <div key={l.uid} className="mb-2 rounded-[11px] border border-line2 bg-bg2 p-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={l.key}
                        onChange={(e) => majLigne(l.uid, { key: e.target.value })}
                        className="min-w-0 flex-1 rounded-[9px] border border-line2 bg-card px-2.5 py-2 text-base text-text outline-none focus:border-mut"
                      >
                        {parZone.map((g) => (
                          <optgroup key={g.zone} label={zoneLabel(g.zone)}>
                            {g.items.map((e) => (
                              <option key={e.key} value={e.key}>
                                {e.name}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setLignes((x) => x.filter((y) => y.uid !== l.uid))}
                        aria-label={`Retirer ${ex?.name ?? 'cet exercice'}`}
                        className="shrink-0 px-2 font-display text-[16px] text-dim"
                      >
                        ×
                      </button>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <label className="flex flex-1 items-center gap-2">
                        <span className="eyebrow shrink-0 text-[9.5px]">Séries</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={50}
                          value={l.sets}
                          onChange={(e) => majLigne(l.uid, { sets: Number(e.target.value) || 1 })}
                          className="num w-full rounded-[9px] border border-line2 bg-card px-2.5 py-2 text-center text-base text-text outline-none focus:border-mut"
                        />
                      </label>
                      <span className="text-[13px] text-dim">×</span>
                      <label className="flex flex-1 items-center gap-2">
                        <span className="eyebrow shrink-0 text-[9.5px]">
                          {ex?.unit === 's' ? 'Sec.' : 'Reps'}
                        </span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={2000}
                          value={l.reps}
                          onChange={(e) => majLigne(l.uid, { reps: Number(e.target.value) || 1 })}
                          className="num w-full rounded-[9px] border border-line2 bg-card px-2.5 py-2 text-center text-base text-text outline-none focus:border-mut"
                        />
                      </label>
                    </div>
                  </div>
                )
              })}

              {exercices.length > 0 && (
                <Button variant="ghost" small onClick={ajouterLigne} className="w-full">
                  {lignes.length === 0 ? 'Ajouter un exercice' : 'Ajouter un autre exercice'}
                </Button>
              )}

              <p className="mt-2 text-[11.5px] leading-relaxed text-dim">
                Ces séries comptent dans ton volume, pas dans tes repères. Un maximum se pose
                pendant un test, pas de mémoire quelques jours plus tard.
              </p>
            </div>
          )}

          {kind === 'swim' && (
            <p className="mt-1 text-[11.5px] leading-relaxed text-dim">
              Le repère « mètres en continu » ne se saisit pas ici. Il se pose pendant un test,
              pas de mémoire plusieurs jours après.
            </p>
          )}

          <div className="mt-3.5">
            <Scale label="Effort perçu" value={rpe} onChange={setRpe} max={10} />
            <p className="mt-1 text-[11.5px] leading-relaxed text-dim">
              Facultatif. Sans lui, la charge de cette séance reposera sur une estimation.
            </p>
          </div>

          <label className="mt-3 block">
            <span className="eyebrow">Note</span>
            <textarea
              value={note}
              rows={2}
              maxLength={1000}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1.5 field"
            />
          </label>

          {erreur && (
            <p className="mt-3 rounded-[11px] border border-bad/40 bg-bad/10 p-3 text-[12.5px] leading-relaxed text-text">
              {erreur}
            </p>
          )}

          <Button onClick={envoyer} disabled={pending || minutes <= 0} className="mt-4">
            {pending ? 'Enregistrement…' : 'Enregistrer la séance'}
          </Button>
        </div>
      </div>
    </div>
  )
}
