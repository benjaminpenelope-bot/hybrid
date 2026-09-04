import { SessionCard } from '@/components/session-card'
import { VerdictCard } from '@/components/verdict-card'
import { decide } from '@/lib/engine/decide'
import { seedState } from '@/lib/seed-data'

/**
 * VITRINE
 *
 * L'écran d'accueil de l'application, sur la page d'accueil du site.
 *
 * Ce ne sont pas des captures : ce sont les composants du produit, rendus
 * avec l'historique de démonstration. Le verdict, les chiffres et l'anneau
 * viennent du moteur, comme dans l'application. Une image se périme le jour
 * où l'écran change ; ceci ne peut pas.
 *
 * Le rendu se fait sur le serveur, à la construction : la page reste
 * statique et n'emporte pas une ligne de JavaScript de plus.
 */

/*
 * Date de référence fixe. `todayISO()` rendrait la page dynamique pour un
 * gain nul — une démonstration n'a pas besoin d'être à la date du visiteur —
 * et la ferait dépendre du jour de la construction.
 */
const JOUR = '2026-03-18'

export function Vitrine() {
  const state = seedState(JOUR)
  const verdict = decide(state, JOUR)
  const seance = state.sessions.find((s) => s.date === JOUR)

  return (
    <div className="relative mx-auto w-full max-w-[352px]">
      {/*
        Le cadre : une bordure claire en haut qui s'éteint vers le bas, comme
        les blocs de verre du reste. Pas d'encoche ni de bouton dessinés — un
        téléphone imité de trop près vieillit avec le modèle qu'il imite.
      */}
      <div
        className="rounded-[38px] p-2"
        style={{
          background: 'linear-gradient(180deg, rgb(255 255 255 / 0.13), rgb(255 255 255 / 0.02))',
        }}
      >
        {/*
          L'écran est coupé en bas par un fondu plutôt que par une bordure
          nette : l'application continue au-delà, et une coupe franche
          laisserait croire qu'on a tout vu.
        */}
        <div
          className="overflow-hidden rounded-[31px] bg-bg px-4 py-5"
          style={{
            maxHeight: 620,
            WebkitMaskImage: 'linear-gradient(180deg, #000 74%, transparent 99%)',
            maskImage: 'linear-gradient(180deg, #000 74%, transparent 99%)',
          }}
        >
          <div className="mb-4 flex items-baseline justify-between">
            <p className="dsp text-[17px]">Aujourd&rsquo;hui</p>
            <p className="text-[11.5px] text-dim">Mercredi 18 mars</p>
          </div>

          <VerdictCard verdict={verdict} />

          <div className="mt-4">
            <p className="eyebrow mb-2">Ta séance du jour</p>
            {/* Le lisere designe ce qu'on vient chercher le matin. */}
            <div className="lisere rounded-card">
              <SessionCard session={seance} />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
