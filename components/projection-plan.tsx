import { projection } from '@/lib/engine/projection'
import type { GoalType, Sport } from '@/lib/engine/types'

/**
 * OÙ LE PLAN MÈNE
 *
 * Douze semaines de programme, résumées en quelques lignes : d'où l'on part,
 * où l'on arrive.
 *
 * Le moteur savait déjà le calculer — le fichier `projection.ts` était écrit
 * et éprouvé — mais aucun écran ne l'affichait. C'était la réponse à la seule
 * question qu'on se pose vraiment le premier jour, et elle restait dans le
 * code.
 *
 * Rien n'y est prédit. Chaque ligne lit le plan déjà généré et annonce ce
 * qu'il contiendra : une prédiction pourrait être fausse, une lecture de plan
 * ne peut pas l'être. D'où la mention « si tu suis le plan », qui n'est pas
 * une précaution mais la description exacte de ce qu'on lit.
 */
export function ProjectionPlan({
  sports,
  objectif,
  baseKm,
  titre = 'Dans douze semaines',
  className = '',
}: {
  sports: Sport[]
  objectif: GoalType | null
  baseKm?: number
  titre?: string
  className?: string
}) {
  const jalons = projection({
    sports,
    goal: objectif,
    ...(baseKm !== undefined ? { baseKm } : {}),
  })
  if (jalons.length === 0) return null

  return (
    <section className={className}>
      <p className="eyebrow mb-1">{titre}</p>
      <p className="mb-3 text-[12px] leading-5 text-dim">
        Si tu suis le plan. Ce ne sont pas des prédictions : c&rsquo;est ce que le programme
        contient déjà, semaine douze.
      </p>

      <div className="card divide-y divide-line py-0">
        {jalons.map((j) => (
          <div key={j.quoi} className="flex items-center justify-between gap-3 py-2.5">
            <span className="min-w-0 flex-1 truncate text-[13px]">{j.quoi}</span>
            {/*
              Depart et arrivee sur la meme ligne, separes par une fleche : la
              progression se lit d'un mouvement, la ou deux colonnes
              obligeraient a comparer.
            */}
            <span className="num flex shrink-0 items-center gap-2 text-[13px]">
              <span className="text-dim">{j.depart}</span>
              <span className="text-dim" aria-hidden>
                →
              </span>
              <span className="text-text">{j.arrivee}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
