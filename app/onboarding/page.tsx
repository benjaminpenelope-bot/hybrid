import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { etatProfil } from '@/lib/db/profil-complet'
import { currentUserId } from '@/lib/supabase/server'
import { OnboardingForm } from './onboarding-form'

export const metadata: Metadata = { title: 'Bienvenue · Hybrid' }

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: { apercu?: string; etape?: string }
}) {
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
   * En apercu, on n'exige pas de session : relire les ecrans ne doit pas
   * demander de se connecter. L'envoi du formulaire echouera faute de
   * compte, ce qui est exactement le bon comportement pour un aperçu.
   */
  const userId = await currentUserId()
  if (!userId && !apercu) redirect('/login?suite=/onboarding')

  /*
   * On ne renvoie que les profils reellement complets. Un compte cree avant
   * l'ajout des objectifs porte `onboarded_at` sans y avoir repondu : il doit
   * pouvoir repasser le questionnaire.
   */
  const { complet, aRepondreDeNouveau } = userId
    ? await etatProfil(userId)
    : { complet: false, aRepondreDeNouveau: false }
  if (complet && !apercu) redirect('/aujourdhui')

  return (
    <main className="wrap wrap-etroit py-8">
      {/*
        L'en-tete est rendu par le formulaire, et non ici : il ne s'affiche
        qu'a la premiere etape. Repete sur les cinq ecrans, il repoussait les
        choix sous la ligne de flottaison a chaque fois, pour redire ce qu'on
        venait de lire.

        `etape` n'est lu qu'en apercu de developpement : voir plus haut.
      */}
      <OnboardingForm
        titre={aRepondreDeNouveau ? 'Complète ton profil' : 'Construisons ton programme'}
        intro={
          aRepondreDeNouveau
            ? 'Le questionnaire s’est enrichi : objectifs, niveau, jours disponibles. Tes séances déjà enregistrées sont conservées, seul le programme à venir est regénéré.'
            : 'Tes réponses génèrent le programme : rien n’est générique, et ce que tu n’as jamais mesuré reste marqué comme tel.'
        }
        etapeInitiale={apercu ? searchParams.etape : undefined}
      />
    </main>
  )
}
