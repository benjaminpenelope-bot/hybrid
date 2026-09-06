import Link from 'next/link'
import { formatPeriode } from '@/lib/engine/date'
import type { BilanHebdo } from '@/lib/engine/historique'

/**
 * SEMAINE APRÈS SEMAINE
 *
 * Le bilan disait ce qui s'est passé cette semaine, jamais ce qui se passe
 * depuis trois mois. C'est pourtant là que se voit la seule chose qu'une
 * séance isolée ne montre pas : une pente.
 *
 * Rien n'est archivé — chaque ligne est recalculée depuis les séances, donc
 * une correction faite aujourd'hui se répercute sur toute l'histoire. Voir
 * `lib/engine/historique`.
 *
 * `libre` est le nombre de semaines visibles sans abonnement. Les suivantes
 * ne sont pas cachées : elles sont annoncées, avec leur date, pour que ce qui
 * manque soit une profondeur et non un mystère.
 */
export function HistoriqueBilans({
  bilans,
  libre,
  pro,
}: {
  bilans: BilanHebdo[]
  libre: number
  pro: boolean
}) {
  if (bilans.length === 0) return null

  const visibles = pro ? bilans : bilans.slice(0, libre)
  const caches = bilans.length - visibles.length

  return (
    <section className="mt-6">
      <h2 className="eyebrow mb-2.5">Semaine après semaine</h2>

      <div className="card divide-y divide-line py-0">
        {visibles.map((b) => {
          const km = b.review.metrics.find((m) => m.label === 'Course')
          return (
            <div key={b.semaine} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-[13px]">{formatPeriode(b.du, b.au)}</p>
                <p className="mt-0.5 text-[11.5px] text-dim">
                  {b.review.done}/{b.review.planned} séance{b.review.planned > 1 ? 's' : ''}
                  {km && km.value !== '0.0 km' ? ` · ${km.value}` : ''}
                </p>
              </div>
              <span className="num shrink-0 text-[20px] leading-none">{b.score}</span>
            </div>
          )
        })}
      </div>

      {!pro && caches > 0 && (
        <div className="mt-2.5 rounded-card border border-line bg-bg2 p-3.5">
          <p className="text-[12.5px] leading-relaxed text-mut">
            <b className="text-text">
              {caches} semaine{caches > 1 ? 's' : ''} de plus {caches > 1 ? 'sont' : 'est'} déjà
              calculée{caches > 1 ? 's' : ''}
            </b>{' '}
            — jusqu&rsquo;au {formatPeriode(bilans[bilans.length - 1]!.du, bilans[bilans.length - 1]!.au)}.
            L&rsquo;historique complet fait partie de HYBRID&nbsp;PRO.
          </p>
          <Link href="/pro" className="btn btn-ghost mt-3 w-full">
            Voir HYBRID PRO
          </Link>
        </div>
      )}
    </section>
  )
}
