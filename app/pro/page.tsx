import { redirect } from 'next/navigation'
import {
  essaiDisponible,
  joursRestants,
  JOURS_ESSAI,
  lireAbonnement,
  PRIX,
} from '@/lib/coach/abonnement'
import { LIMITES, MODELES, planDe } from '@/lib/coach/quota'
import { paiementOuvert } from '@/lib/paiement/stripe'
import { currentUserId } from '@/lib/supabase/server'
import { EssaiBouton } from './essai-bouton'
import { PaiementBoutons, PortailBouton } from './paiement-boutons'

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

export default async function Page({
  searchParams,
}: {
  searchParams: { paiement?: string }
}) {
  const userId = await currentUserId()
  if (!userId) redirect('/login?suite=/pro')

  const ouvert = paiementOuvert()

  const [plan, abonnement, essai] = await Promise.all([
    planDe(userId),
    lireAbonnement(userId),
    essaiDisponible(userId),
  ])
  const restants = abonnement ? joursRestants(abonnement, new Date()) : 0
  const enEssai = plan === 'pro' && abonnement?.statut === 'essai'
  /** Deja payant : c'est le seul cas ou l'on ne propose plus de s'abonner. */
  const dejaAbonne = plan === 'pro' && abonnement?.source === 'stripe'

  return (
    <main className="wrap py-[18px]">
      <h1 className="dsp text-[22px]">HYBRID PRO</h1>

      {/*
        Le retour de Stripe ne prouve rien : c'est le webhook signe qui decide
        de l'acces. On confirme donc la reception, pas l'activation, et on dit
        que la bascule peut prendre un instant.
      */}
      {searchParams.paiement === 'ok' && (
        <p className="mb-4 mt-3 rounded-[11px] border border-ok/40 bg-ok/10 p-3 text-[12.5px] leading-relaxed text-text">
          Paiement reçu, merci. L&apos;activation se fait dans la foulée — recharge cette page si
          ton abonnement n&apos;apparaît pas encore.
        </p>
      )}
      {searchParams.paiement === 'annule' && (
        <p className="mb-4 mt-3 rounded-[11px] border border-line2 bg-bg2 p-3 text-[12.5px] leading-relaxed text-mut">
          Paiement abandonné. Rien ne t&apos;a été prélevé.
        </p>
      )}

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

        {/*
          Les boutons restent visibles pendant l'essai. Les masquer obligerait
          a attendre l'expiration pour s'abonner, soit l'inverse de ce qu'un
          essai sert a faire. Ils ne disparaissent que pour qui paie deja.
        */}
        {ouvert && !dejaAbonne && (
          <div className="mt-4 border-t border-line pt-4">
            {enEssai && (
              <p className="mb-3 text-[12.5px] leading-relaxed text-mut">
                Tu peux t&apos;abonner dès maintenant : tes {restants} jour
                {restants > 1 ? 's' : ''} d&apos;essai restants sont conservés, et le premier
                prélèvement n&apos;a lieu qu&apos;à leur terme.
              </p>
            )}
            <PaiementBoutons prix={{ mensuel: PRIX.mensuel, annuel: PRIX.annuel }} />
          </div>
        )}

        {ouvert && dejaAbonne && (
          <div className="mt-4 border-t border-line pt-4">
            <PortailBouton />
          </div>
        )}
      </section>

      {plan !== 'pro' && essai && (
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
      {!ouvert && plan !== 'pro' && (
        <p className="mt-4 text-[12.5px] leading-relaxed text-mut">
          L&apos;abonnement payant n&apos;est pas encore ouvert sur ce serveur. Ton essai terminé,
          tu restes sur l&apos;offre gratuite — sans rien à faire, et sans rien à payer.
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
