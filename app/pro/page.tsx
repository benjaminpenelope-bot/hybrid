import { redirect } from 'next/navigation'
import {
  essaiDisponible,
  joursRestants,
  JOURS_ESSAI,
  lireAbonnement,
  PRIX,
} from '@/lib/coach/abonnement'
import { LIMITES, MODELES, planDe } from '@/lib/coach/quota'
import { currentUserId } from '@/lib/supabase/server'
import { EssaiBouton } from './essai-bouton'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'HYBRID PRO · Hybrid' }

/** Ce que chaque offre donne, cote a cote. Les chiffres viennent du code. */
function comparaison() {
  return [
    {
      quoi: 'Programme, séances, suivi du corps',
      free: 'Tout',
      pro: 'Tout',
    },
    {
      quoi: 'Messages au coach',
      free: `${LIMITES.free.jour}/jour · ${LIMITES.free.mois}/mois`,
      pro: `${LIMITES.pro.jour}/jour · ${LIMITES.pro.mois}/mois`,
    },
    {
      quoi: 'Modèle du coach',
      free: 'Rapide',
      pro: 'Le plus fin, qui raisonne davantage',
    },
    {
      quoi: 'Export de tes données, suppression du compte',
      free: 'Oui',
      pro: 'Oui',
    },
  ]
}

export default async function Page() {
  const userId = await currentUserId()
  if (!userId) redirect('/login?suite=/pro')

  const [plan, abonnement, essai] = await Promise.all([
    planDe(userId),
    lireAbonnement(userId),
    essaiDisponible(userId),
  ])
  const restants = abonnement ? joursRestants(abonnement, new Date()) : 0

  return (
    <main className="wrap py-[18px]">
      <h1 className="dsp text-[22px]">HYBRID PRO</h1>

      {plan === 'pro' ? (
        <p className="mb-5 mt-2 rounded-[11px] border border-ok/40 bg-ok/10 p-3 text-[12.5px] leading-relaxed text-text">
          {abonnement?.statut === 'essai'
            ? `Ton essai est actif. Il reste ${restants} jour${restants > 1 ? 's' : ''}, après quoi tu repasses sur l’offre gratuite si tu ne t’abonnes pas.`
            : `Ton abonnement est actif pour encore ${restants} jour${restants > 1 ? 's' : ''}.`}
        </p>
      ) : (
        <p className="mb-5 mt-2 text-[12.5px] leading-relaxed text-mut">
          Le programme, les séances et le suivi restent gratuits, entièrement. PRO ne débloque
          qu&apos;une chose : un coach qu&apos;on peut solliciter souvent, et qui réfléchit plus
          longtemps avant de répondre.
        </p>
      )}

      <section className="card mb-4">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="text-left">
              <th className="eyebrow pb-2 font-normal"> </th>
              <th className="eyebrow pb-2 font-normal">Gratuit</th>
              <th className="eyebrow pb-2 font-normal text-brand">PRO</th>
            </tr>
          </thead>
          <tbody>
            {comparaison().map((l) => (
              <tr key={l.quoi} className="border-t border-line align-top">
                <td className="py-2.5 pr-3 text-mut">{l.quoi}</td>
                <td className="py-2.5 pr-3">{l.free}</td>
                <td className="py-2.5 text-text">{l.pro}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card mb-4">
        <p className="eyebrow">Le prix</p>
        <p className="dsp mt-2 text-[26px]">
          {PRIX.mensuel} <span className="text-[14px] text-mut">par mois</span>
        </p>
        <p className="mt-1 text-[12.5px] text-mut">
          ou {PRIX.annuel} à l&apos;année, soit deux mois offerts.
        </p>
      </section>

      {plan !== 'pro' && (
        <section className="card">
          <p className="eyebrow">Essai</p>
          <p className="mb-3 mt-2 text-[13.5px] leading-relaxed">
            {JOURS_ESSAI} jours de PRO, sans carte bancaire.
          </p>
          <EssaiBouton disponible={essai} />
        </section>
      )}

      {/*
        Le paiement n'est pas branche. Le dire plutot que d'afficher un bouton
        qui ne mene nulle part : une promesse non tenue en vitrine coute plus
        cher qu'une absence annoncee.
      */}
      {plan !== 'pro' && !essai && (
        <p className="mt-4 text-[12.5px] leading-relaxed text-mut">
          L&apos;abonnement payant n&apos;est pas encore ouvert. Ton essai terminé, tu restes sur
          l&apos;offre gratuite jusqu&apos;à l&apos;ouverture — sans rien à faire.
        </p>
      )}

      <p className="mt-6 text-[11.5px] leading-relaxed text-mut">
        Le coach du plan gratuit tourne sur {MODELES.free.modele.startsWith('claude-sonnet') ? 'un modèle rapide' : 'un modèle standard'}, celui de PRO sur le
        plus capable. Dans les deux cas, l&apos;analyse de ta charge et de ta récupération est
        calculée par l&apos;application, pas par le modèle : elle est identique.
      </p>
    </main>
  )
}
