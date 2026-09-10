import { redirect } from 'next/navigation'
import { loadState } from '@/lib/db/queries'
import { projectionDeLAthlete } from '@/lib/engine/projection'
import { trajectoire, type Discipline, type Trajectoire } from '@/lib/engine/trajectoire'
import { currentUserId } from '@/lib/supabase/server'
import { TrajectoireVue } from './trajectoire-vue'
import { jourDeLAthlete } from '@/lib/db/jour'

/** Doit rester aligne sur les pastilles de `TrajectoireVue`. */
const HORIZONS = [4, 12, 26, 52] as const

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Trajectoire · Hybrid' }

export default async function Page() {
  const userId = await currentUserId()
  if (!userId) redirect('/login?suite=/projection')

  const state = await loadState(userId)
  if (!state || state.sessions.length === 0) redirect('/onboarding')

  const today = jourDeLAthlete()

  /*
   * Une trajectoire par discipline PRATIQUEE, calculee au plus long. Changer
   * d'horizon devient alors une decoupe cote client, instantanee, et un meme
   * chiffre ne peut pas differer d'une vue a l'autre. Voir `surHorizon`.
   *
   * On ne propose que ce qui est declare : un onglet natation chez qui ne
   * nage pas n'aurait rien a montrer, et un onglet vide se lit comme une
   * panne plutot que comme une absence.
   */
  const sports = state.profile.sports ?? []
  const pratique: Record<Discipline, boolean> = {
    course: sports.length === 0 || sports.includes('running'),
    natation: sports.includes('swimming'),
    force: sports.includes('strength') || sports.includes('street_workout'),
  }
  const completes = Object.fromEntries(
    (['course', 'natation', 'force'] as Discipline[])
      .filter((d) => pratique[d])
      .map((d) => [d, trajectoire(state, today, { avant: 10, apres: 52, discipline: d })]),
  ) as Partial<Record<Discipline, Trajectoire>>

  const complete = completes.course ?? Object.values(completes)[0]!

  /*
   * Les autres disciplines gardent leur forme « depart → arrivee » : la nage
   * et la barre ne se lisent pas sur une courbe de kilometres, et leur
   * projection tient en une ligne chacune.
   *
   * Un jeu par horizon, calcule d'avance. Un seul jeu fige a douze semaines
   * aurait affiche les memes valeurs sous un curseur regle sur un an, ce qui
   * est exactement la sorte d'incoherence qu'on passe son temps a corriger
   * ailleurs.
   */
  const jalons = Object.fromEntries(
    HORIZONS.map((h) => [
      h,
      projectionDeLAthlete(state, today, h).jalons.filter(
        (j) => !j.quoi.toLowerCase().includes('course'),
      ),
    ]),
  )

  return (
    <main className="wrap py-[18px]">
      <h1 className="dsp text-[22px]">Ta trajectoire</h1>
      <p className="mb-4 mt-1 text-[12.5px] text-dim">
        Semaine {complete.semaineActuelle} de ton programme
      </p>

      <TrajectoireVue completes={completes} jalons={jalons} />
    </main>
  )
}
