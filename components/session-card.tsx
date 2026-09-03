import Link from 'next/link'
import { SESSION_CHANNEL, SESSION_META, teinte } from '@/lib/ui/session-meta'
import type { Session } from '@/lib/engine/types'

/** Séance du jour, dépliée : ce qu'on fait, pourquoi, et de quoi la commencer. */
export function SessionCard({ session }: { session: Session | undefined }) {
  if (!session || session.type === 'REST') {
    return (
      <div className="card px-4 py-8 text-center">
        <div className="text-[32px]" aria-hidden>
          😴
        </div>
        <div className="dsp mt-2 text-[22px]">Récupération</div>
        <p className="mx-auto mt-2 max-w-[34ch] text-[13px] leading-relaxed text-mut">
          {session?.goal ?? "Aucune séance programmée aujourd'hui."}
        </p>
        {session?.cues && session.cues.length > 0 && (
          <ul className="mt-4 flex flex-col gap-1.5 text-left text-[12.5px] text-mut">
            {session.cues.map((cue) => (
              <li key={cue} className="flex gap-2">
                <span className="text-dim" aria-hidden>
                  ·
                </span>
                {cue}
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  const meta = SESSION_META[session.type]
  const canal = SESSION_CHANNEL[session.type]
  const done = session.status === 'done'

  /*
   * L'anneau irise ne s'allume que sur une seance a faire.
   *
   * C'est le seul element irise de l'ecran, et c'est ce qui lui donne son
   * sens : il ne decore pas, il designe. Une seance deja realisee n'a plus
   * rien a designer — l'eteindre est ce qui fait qu'allume, il veut dire
   * quelque chose.
   */
  const designe = !done

  /*
   * Deux elements imbriques, et c'est necessaire : l'anneau deborde de deux
   * pixels hors de la carte, donc le `overflow-hidden` qui arrondit le
   * contenu le decouperait. L'enveloppe porte l'anneau, l'interieur porte la
   * decoupe.
   */
  return (
    <div
      className={`rounded-card ${designe ? 'iris' : ''}`}
      style={
        designe
          ? { boxShadow: `0 0 48px ${teinte(canal, 0.18)}, 0 14px 44px rgb(0 0 0 / 0.55)` }
          : undefined
      }
    >
      <div className="glass overflow-hidden rounded-card">
      <div
        className="px-4 pb-4 pt-[18px]"
        style={{ background: `linear-gradient(160deg, ${teinte(canal, 0.14)}, transparent 70%)` }}
      >
        <div className="mb-3 flex items-center justify-between">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-display text-[10.5px] font-semibold uppercase tracking-[0.09em]"
            style={{
              color: meta.color,
              borderColor: teinte(canal, 0.34),
              background: teinte(canal, 0.1),
            }}
          >
            <meta.Icon size={14} />
            {meta.label}
          </span>
          <span className="num text-[13px] text-mut">{session.duration} min</span>
        </div>

        <h3 className="dsp text-[27px] leading-[1.05]">{session.title}</h3>
        {session.goal && (
          <p className="mt-2 text-[13.5px] leading-relaxed text-mut">{session.goal}</p>
        )}

        <div className="mt-3 flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className="h-[3px] flex-1 rounded-full"
              style={{ background: i <= session.intensity ? meta.color : 'var(--line)' }}
            />
          ))}
          <span className="eyebrow ml-2 text-[9.5px]">Intensité {session.intensity}/5</span>
        </div>
      </div>

      {done ? (
        <div className="border-t border-line p-4 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ok px-2.5 py-1 font-display text-[10.5px] font-semibold uppercase tracking-[0.09em] text-bg">
            Séance terminée
          </span>
        </div>
      ) : (
        <div className="border-t border-line p-4">
          {session.why && (
            <p className="mb-3.5 text-[12.5px] leading-relaxed text-mut">
              <b className="text-text">Pourquoi cette séance : </b>
              {session.why}
            </p>
          )}

          {session.target && (
            <p className="mb-3.5 text-[12.5px] leading-relaxed text-mut">
              <b className="text-text">Objectif : </b>
              {session.target}
            </p>
          )}

          {session.exercises.length > 0 && (
            <ul className="mb-3.5">
              {session.exercises.slice(0, 6).map((e, i) => (
                <li
                  key={e.n}
                  className={`flex items-center justify-between py-[7px] ${
                    i < Math.min(session.exercises.length, 6) - 1 ? 'border-b border-line' : ''
                  }`}
                >
                  <span
                    className="pr-3 text-[13px]"
                    style={{ color: e.test ? 'var(--warn)' : 'var(--text)' }}
                  >
                    {e.n}
                  </span>
                  <span className="num whitespace-nowrap text-[13px] text-mut">
                    {e.sets} × {e.reps}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {session.finisher && (
            <p className="mb-3.5 rounded-[11px] border border-line bg-bg2 p-3 text-[12.5px] leading-relaxed text-mut">
              <b className="text-text">Enchaîné : {session.finisher.title}</b> —{' '}
              {session.finisher.exercises.map((e) => e.n).join(', ')}.
            </p>
          )}

          <Link
            href={`/seance/${session.id}`}
            className="btn btn-solid w-full"
          >
            Commencer la séance
          </Link>
          <Link
            href={`/seance/${session.id}/modifier`}
            className="btn btn-sm btn-ghost mt-2 w-full"
          >
            Modifier la séance
          </Link>
        </div>
      )}
      </div>
    </div>
  )
}
