import type { Verdict } from '@/lib/engine/decide'
import { verdictTexte } from '@/lib/engine/verdict-texte'

/**
 * CE QUE TU DOIS SAVOIR AUJOURD'HUI
 *
 * Ouvre l'écran à la place du score. Une phrase d'état, ce qu'elle change, et
 * — repliées — les données chiffrées qui l'ont produite.
 *
 * Les preuves sont dans un `<details>` fermé par défaut : elles doivent rester
 * consultables, parce qu'une décision qu'on ne peut pas vérifier ne se
 * discute pas. Mais elles n'ouvrent pas l'écran, parce qu'un ratio ne dit à
 * personne quoi faire de sa journée.
 */

/** Une teinte par famille de décision. Le violet de marque n'entre pas ici. */
const TON: Record<Verdict['action'], { bord: string; fond: string; texte: string }> = {
  repos: { bord: 'var(--bad)', fond: 'rgba(216,82,74,0.10)', texte: 'var(--bad)' },
  alleger: { bord: 'var(--warn)', fond: 'rgba(224,167,60,0.10)', texte: 'var(--warn)' },
  deplacer: { bord: 'var(--warn)', fond: 'rgba(224,167,60,0.10)', texte: 'var(--warn)' },
  progresser: { bord: 'var(--ok)', fond: 'rgba(91,191,123,0.10)', texte: 'var(--ok)' },
  maintenir: { bord: 'var(--line2)', fond: 'var(--card)', texte: 'var(--mut)' },
}

const LIBELLE: Record<Verdict['action'], string> = {
  repos: 'Repos',
  alleger: 'Séance allégée',
  deplacer: 'Séance décalée',
  progresser: 'On monte',
  maintenir: 'Rien ne change',
}

export function VerdictCard({ verdict }: { verdict: Verdict }) {
  const t = verdictTexte(verdict)
  const ton = TON[verdict.action]

  return (
    <section
      className="rounded-card border p-4"
      style={{ borderColor: ton.bord, background: ton.fond }}
      aria-label="Ta situation du jour"
    >
      <p className="eyebrow" style={{ color: ton.texte }}>
        {LIBELLE[verdict.action]}
      </p>

      <h2 className="dsp mt-2 text-[22px] leading-tight">{t.titre}</h2>
      <p className="mt-2 text-[13.5px] leading-relaxed text-mut">{t.detail}</p>

      {t.sante && (
        <p className="mt-3 rounded-[11px] border border-bad/40 bg-bad/10 p-3 text-[12.5px] leading-relaxed text-text">
          {t.sante}
        </p>
      )}

      {verdict.confirmationRequise && (
        <p className="mt-3 text-[12.5px] leading-relaxed text-text">
          Rien n&apos;est appliqué tant que tu n&apos;as pas confirmé.
        </p>
      )}

      {verdict.preuves.length > 0 && (
        <details className="mt-3 border-t border-line pt-3">
          <summary className="eyebrow cursor-pointer text-dim">Sur quoi je me base</summary>
          <dl className="mt-3 flex flex-col gap-3">
            {verdict.preuves.map((p) => (
              <div key={`${p.quoi}-${p.valeur}`}>
                <dt className="flex items-baseline justify-between gap-3 text-[12.5px]">
                  <span className="text-mut">{p.quoi}</span>
                  <span className="num shrink-0 text-text">{p.valeur}</span>
                </dt>
                <dd className="mt-0.5 text-[11.5px] leading-relaxed text-dim">{p.effet}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </section>
  )
}
