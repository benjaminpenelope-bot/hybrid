import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { etatProfil } from '@/lib/db/profil-complet'
import { currentUserId } from '@/lib/supabase/server'
import { OnboardingForm } from './onboarding-form'

export const metadata: Metadata = { title: 'Bienvenue · Hybrid' }

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: { apercu?: string }
}) {
  const userId = await currentUserId()
  if (!userId) redirect('/login?suite=/onboarding')

  /*
   * Apercu de travail : permet de revoir le questionnaire alors qu'on l'a
   * deja rempli, sans avoir a creer un compte jetable a chaque retouche.
   *
   * Explicitement borne au developpement. En production la condition est
   * fausse quoi qu'on mette dans l'adresse, donc la porte n'existe pas :
   * autrement, n'importe qui pourrait relancer le questionnaire d'un compte
   * complet et ecraser son programme.
   */
  const apercu = process.env.NODE_ENV === 'development' && searchParams.apercu === '1'

  /*
   * On ne renvoie que les profils reellement complets. Un compte cree avant
   * l'ajout des objectifs porte `onboarded_at` sans y avoir repondu : il doit
   * pouvoir repasser le questionnaire.
   */
  const { complet, aRepondreDeNouveau } = await etatProfil(userId)
  if (complet && !apercu) redirect('/aujourdhui')

  return (
    <main className="wrap wrap-etroit py-8">
      <header className="mb-7">
        <h1 className="dsp text-[26px]">
          {aRepondreDeNouveau ? 'Compl\u00e8te ton profil' : 'Construisons ton programme'}
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-mut">
          {aRepondreDeNouveau
            ? 'Le questionnaire s\u2019est enrichi : objectifs, niveau, jours disponibles. Tes s\u00e9ances d\u00e9j\u00e0 enregistr\u00e9es sont conserv\u00e9es, seul le programme \u00e0 venir est reg\u00e9n\u00e9r\u00e9.'
            : 'Tes r\u00e9ponses g\u00e9n\u00e8rent le programme : rien n\u2019est g\u00e9n\u00e9rique, et ce que tu n\u2019as jamais mesur\u00e9 reste marqu\u00e9 comme tel.'}
        </p>
      </header>

      <OnboardingForm />
    </main>
  )
}
