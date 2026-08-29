'use client'

/**
 * COMMENT C'ÉTAIT ?
 *
 * Cinq visages à la place d'une échelle de 1 à 10. Le moteur continue de
 * recevoir un RPE — c'est lui qui calcule la charge — mais l'athlète ne voit
 * jamais le mot ni le chiffre.
 *
 * Pourquoi cinq et pas dix : demander « 6 ou 7 ? » après une séance produit
 * une réponse arbitraire, et une fausse précision se propage ensuite dans
 * toute la charge. Cinq niveaux se distinguent vraiment.
 *
 * La correspondance est volontairement espacée pour couvrir l'échelle sans
 * inventer de milieu : rien ne vaut 5, parce que personne ne sait dire la
 * différence entre 5 et 6 de mémoire.
 */

export interface NiveauRessenti {
  rpe: number
  emoji: string
  label: string
}

export const RESSENTIS: NiveauRessenti[] = [
  { rpe: 2, emoji: '😌', label: 'Facile' },
  { rpe: 4, emoji: '🙂', label: 'Bien' },
  { rpe: 6, emoji: '😐', label: 'Difficile' },
  { rpe: 8, emoji: '🥵', label: 'Très difficile' },
  { rpe: 10, emoji: '💀', label: 'Épuisant' },
]

export function Ressenti({
  label,
  value,
  onChange,
  hint,
}: {
  label: string
  /** RPE sur 10. `null` tant que rien n'est choisi. */
  value: number | null
  onChange: (rpe: number) => void
  hint?: string
}) {
  return (
    <div className="mb-4">
      <div className="eyebrow mb-[9px]">{label}</div>
      <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={label}>
        {RESSENTIS.map((n) => {
          const actif = value === n.rpe
          return (
            <button
              key={n.rpe}
              type="button"
              role="radio"
              aria-checked={actif}
              onClick={() => onChange(n.rpe)}
              className={`flex min-h-[76px] touch-manipulation flex-col items-center justify-center gap-1.5 rounded-[13px] border px-1 py-2 transition-colors active:opacity-60 ${
                actif ? 'border-text bg-text/[0.08]' : 'border-line2 bg-bg2'
              }`}
            >
              <span className="text-[26px] leading-none" aria-hidden>
                {n.emoji}
              </span>
              <span
                className={`text-center text-[10.5px] leading-tight ${actif ? 'text-text' : 'text-dim'}`}
              >
                {n.label}
              </span>
            </button>
          )
        })}
      </div>
      {hint && <p className="mt-[9px] text-[11.5px] leading-relaxed text-dim">{hint}</p>}
    </div>
  )
}
