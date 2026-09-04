/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next'
import Link from 'next/link'
import { LogoMark } from '@/components/logo'
import { DemoSemaine } from '@/components/landing/demo-semaine'
import { AnneauVideo } from '@/components/anneau-video'
import { BandeVideo } from '@/components/bande-video'
import { Vitrine } from '@/components/landing/vitrine'
import { IconBarre, IconCourse, IconNatation, IconVelo } from '@/components/ui/icons'

export const metadata: Metadata = {
  title: 'HYBRID · Un entraîneur. Tous tes entraînements.',
  description:
    "L'entraîneur intelligent qui adapte ton programme à ton objectif, tes sports, ta charge et ta récupération.",
}

const SPORTS = [
  { nom: 'Course', Icon: IconCourse },
  { nom: 'Force', Icon: IconBarre },
  { nom: 'Natation', Icon: IconNatation },
  { nom: 'Vélo', Icon: IconVelo },
] as const

export default function LandingPage() {
  return (
    <main className="relative overflow-hidden">
      <Header />
      <Hero />
      {/* La bande fait le passage entre la promesse et sa demonstration. */}
      <BandeVideo />
      <Demonstration />
      <Ecran />
      <Coach />
      <Tarifs />
      <Pied />
    </main>
  )
}

/* ── Fond ─────────────────────────────────────────────────────
 *
 * Le tourbillon de chrome est le logo lui-meme, agrandi et floute. Une image
 * d'ambiance achetee ferait le meme effet, mais celle-ci appartient a la
 * marque : le halo derriere le verre est litteralement la forme qu'on retrouve
 * en petit dans l'application.
 */
function Aura({ taille, className }: { taille: string; className: string }) {
  return (
    <div className={`pointer-events-none absolute ${className}`} aria-hidden>
      <img
        src="/mark.png"
        alt=""
        style={{
          /*
           * Taille exprimee relativement a l'ecran, jamais en pixels fixes.
           *
           * Une aura plus large que la fenetre se fait trancher par le
           * `overflow-hidden` de la page : le flou s'arrete net sur les deux
           * bords, et le disque parait aplati. C'etait visible sur telephone
           * et invisible sur ordinateur, ou la fenetre est plus large que
           * l'image.
           */
          width: taille,
          height: taille,
          /*
           * `brightness` avant le flou, et pas seulement l'opacite : le logo
           * est majoritairement noir, donc le flouter tel quel donne un gris
           * sombre qui se perd sur le fond. Il faut lever l'argent pour que la
           * forme reste lisible une fois diffusee.
           *
           * Flou reduit de 52 a 34 px : la forme redevient reconnaissable
           * sans redevenir un logo — c'est une presence, pas une signature.
           */
          filter: 'saturate(0) brightness(2.2) blur(34px)',
          opacity: 0.5,
          animation: 'rotation-lente 90s linear infinite',
        }}
      />
    </div>
  )
}

function Header() {
  return (
    <header className="relative z-20 mx-auto flex w-full max-w-[1120px] items-center justify-between px-4 py-5 sm:px-6">
      <span className="flex items-center gap-2.5">
        <LogoMark size={30} title="Hybrid" />
        <span className="dsp text-[19px]">Hybrid</span>
      </span>

      <nav className="flex items-center gap-2">
        <Link href="/login" className="btn btn-sm btn-ghost">
          Se connecter
        </Link>
      </nav>
    </header>
  )
}

/* ── Ouverture ────────────────────────────────────────────────
 *
 * Une carte de verre posee sur le noir, le logo floute derriere, et le mot
 * de la marque en fantome sous la ligne de flottaison. Toute la page tient sur
 * cette premiere image : c'est la seule qu'un visiteur regarde a coup sur.
 */
function Hero() {
  return (
    <section className="relative px-4 pb-24 pt-10 sm:px-6 sm:pt-16">
      <Aura taille="min(620px, 86vw)" className="left-1/2 top-[-110px] -translate-x-1/2" />

      <div className="relative z-10 mx-auto flex max-w-[760px] flex-col items-center text-center">
        <h1 className="entre dsp text-[clamp(2.6rem,10vw,4.6rem)]">
          Un entraîneur.
          <br />
          Tous tes entraînements.
        </h1>

        <p className="entre mt-5 max-w-[30rem] text-[16px] leading-7 text-mut" style={{ animationDelay: '180ms' }}>
          Course, force, natation, vélo. Un seul programme, qui se réajuste à ta charge et à ta
          récupération plutôt qu'à un calendrier théorique.
        </p>

        {/*
          La carte reprend la composition de l'inscription : un champ, un
          bouton. L'adresse saisie est transmise au formulaire de creation de
          compte — un champ qui jetterait ce qu'on y ecrit ne serait qu'un
          decor, et le visiteur devrait la retaper.
        */}
        <form
          action="/login"
          method="get"
          className="entre glass lisere mt-9 w-full max-w-[430px] rounded-[26px] p-6"
          style={{ animationDelay: '280ms' }}
        >
          <p className="dsp text-[20px]">Crée ton compte</p>
          <p className="mx-auto mt-2 max-w-[26rem] text-[13.5px] leading-6 text-mut">
            Gratuit, sans carte bancaire. Ton premier programme est construit à la fin du
            questionnaire.
          </p>

          <input type="hidden" name="inscription" value="1" />
          <label htmlFor="email-hero" className="sr-only">
            Adresse e-mail
          </label>
          {/* Le filet argente tourne autour du champ : c'est par la que tout
              commence, c'est donc lui qu'on doit voir. */}
          <input
            id="email-hero"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            placeholder="toi@exemple.fr"
            className="field lisere mt-5 text-center"
          />
          <button type="submit" className="btn btn-solid w-full">
            Commencer
          </button>

          <p className="mt-3 text-[12px] leading-5 text-dim">
            14 jours de HYBRID PRO offerts, sans carte. À leur terme tu repasses sur l'offre
            gratuite, sans rien à faire.
          </p>
        </form>

        <ul
          className="entre mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3"
          style={{ animationDelay: '380ms' }}
        >
          {SPORTS.map((s) => (
            <li key={s.nom} className="flex items-center gap-2 text-[13.5px] text-mut">
              <s.Icon size={18} />
              {s.nom}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ── La demonstration ─────────────────────────────────────────
 *
 * Entre la promesse et le coach : on annonce un programme qui s'adapte, on le
 * montre, puis on explique qui l'arbitre. Cette place etait occupee par le mot
 * de la marque en filigrane — trois cent cinquante pixels pour redire ce que
 * l'en-tete affiche deja.
 */
function Demonstration() {
  return (
    <section className="relative px-4 pb-4 pt-2 sm:px-6">
      <div className="relative z-10 mx-auto max-w-[760px]">
        <div className="mx-auto mb-8 max-w-[560px] text-center">
          <p className="eyebrow">La forme de ta semaine</p>
          <h2 className="dsp mt-3 text-[clamp(1.7rem,5.5vw,2.4rem)]">
            Chaque objectif donne une semaine différente.
          </h2>
          <p className="mt-4 text-[14.5px] leading-7 text-mut">
            Ce ne sont pas des exemples dessinés pour la vitrine : ces sept cases lisent le
            générateur du produit. La semaine affichée est celle qu&rsquo;il construirait.
          </p>
        </div>

        <DemoSemaine />
      </div>
    </section>
  )
}

/* ── L'ecran ─────────────────────────────────────────────────
 *
 * Apres la forme de la semaine, ce qu'on ouvre le matin. La page parlait
 * d'un verdict et de preuves sans jamais en montrer un seul.
 */
function Ecran() {
  return (
    <section className="relative px-4 py-16 sm:px-6">
      <Aura taille="min(560px, 84vw)" className="left-1/2 top-[18%] -translate-x-1/2" />

      <div className="relative z-10 mx-auto max-w-[1080px]">
        <div className="mx-auto mb-10 max-w-[560px] text-center">
          <p className="eyebrow">L&rsquo;écran du matin</p>
          <h2 className="dsp mt-3 text-[clamp(1.7rem,5.5vw,2.4rem)]">
            Une décision, puis les chiffres qui l&rsquo;ont prise.
          </h2>
          <p className="mt-4 text-[14.5px] leading-7 text-mut">
            Ce n&rsquo;est pas une capture d&rsquo;écran : ce sont les composants de
            l&rsquo;application, rendus avec un historique de démonstration. Le verdict, la séance et
            son « pourquoi » sortent du moteur.
          </p>
        </div>

        <Vitrine />
      </div>
    </section>
  )
}

/* ── Le coach ─────────────────────────────────────────────────
 *
 * Une sphere au centre, les ecrans de l'application autour. Ce qui est montre
 * n'est pas une maquette inventee : ce sont les vraies phrases que le moteur
 * produit, verdict et preuves comprises. C'est la seule chose que les
 * concurrents ne peuvent pas copier d'une capture d'ecran.
 */
const AUTOUR = [
  {
    titre: 'Le verdict du jour',
    corps: 'Séance prévue, telle quelle.',
    detail: 'Rien ne justifie de toucher à la séance.',
  },
  {
    titre: 'Ce sur quoi il se base',
    corps: 'Récupération 79/100',
    detail: 'Charge sur 7 jours · 1015 unités',
  },
  {
    titre: 'Quand il allège',
    corps: 'Tu as signalé une douleur.',
    detail: 'La séance est allégée de 30 %.',
  },
  {
    titre: 'Ce qu’il refuse de faire',
    corps: 'À TESTER',
    detail: 'Un repère non mesuré ne devient jamais un chiffre.',
  },
] as const

function Coach() {
  /*
   * Pas d'aura dans cette section : le logo flou tournait derriere la video,
   * et deux formes circulaires animees au meme endroit se disputaient le
   * regard sans qu'aucune ne gagne.
   */
  return (
    <section className="relative px-4 py-20 sm:px-6">
      <div className="relative z-10 mx-auto max-w-[1120px]">
        <div className="mx-auto max-w-[640px] text-center">
          <p className="eyebrow">Le coach</p>
          <h2 className="dsp mt-3 text-[clamp(1.9rem,6vw,2.8rem)]">
            Il décide, et il montre pourquoi.
          </h2>
          <p className="mt-4 text-[15px] leading-7 text-mut">
            La plupart des applications enregistrent tes séances. Celle-ci tranche : elle te dit
            quoi faire aujourd&rsquo;hui, et elle ouvre le détail des chiffres qui l&rsquo;ont
            décidé.
          </p>
        </div>

        {/*
          Trois colonnes sur grand ecran, la mediane vide : c'est elle qui
          donne sa place a la sphere. Avec une grille de deux colonnes, les
          cartes se touchaient presque et la sphere ne pointait que dans
          l'interstice.
        */}
        <div className="mt-14 grid gap-4 md:grid-cols-[1fr_260px_1fr] md:gap-6">
          <div className="flex flex-col gap-4">
            {AUTOUR.slice(0, 2).map((c) => (
              <CarteCoach key={c.titre} {...c} />
            ))}
          </div>

          {/*
            Sur grand ecran la sphere occupe la colonne mediane ; sur mobile
            elle passe au-dessus des cartes. Elle etait jusqu'ici en
            `hidden md:flex`, c'est-a-dire absente de la majorite des visites.
          */}
          <div
            className="order-first flex items-center justify-center pb-5 md:order-none md:pb-0"
            aria-hidden
          >
            <AnneauVideo className="w-[210px] md:w-[290px]" />
          </div>

          <div className="flex flex-col gap-4">
            {AUTOUR.slice(2).map((c) => (
              <CarteCoach key={c.titre} {...c} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function CarteCoach({
  titre,
  corps,
  detail,
}: {
  titre: string
  corps: string
  detail: string
}) {
  return (
    <article className="glass rounded-card p-5">
      <p className="eyebrow">{titre}</p>
      <p className="dsp mt-2.5 text-[19px]">{corps}</p>
      <p className="mt-1.5 text-[13.5px] leading-6 text-mut">{detail}</p>
    </article>
  )
}

/* ── Tarifs ───────────────────────────────────────────────── */

const OFFRES = [
  {
    nom: 'HYBRID',
    prix: '0 €',
    periode: 'pour toujours',
    resume: 'Le programme, les séances et le suivi. Entièrement.',
    points: [
      'Programme construit sur tes sports et ton objectif',
      'Séances détaillées, avec le pourquoi de chacune',
      'Suivi du corps, des performances et de la charge',
      'Coach : 3 messages par jour',
      'Export de tes données, suppression du compte',
    ],
    cta: 'Créer mon compte',
    phare: false,
  },
  {
    nom: 'HYBRID PRO',
    prix: '9,99 €',
    periode: 'par mois · ou 79,99 € par an',
    resume: 'Un coach qu’on peut solliciter souvent, et qui réfléchit plus longtemps.',
    points: [
      'Tout ce que contient l’offre gratuite',
      'Coach : 15 messages par jour',
      'Le modèle le plus fin, qui raisonne davantage',
      'Adaptation de la semaine en cours',
      '14 jours d’essai, sans carte bancaire',
    ],
    cta: 'Essayer 14 jours',
    phare: true,
  },
] as const

function Tarifs() {
  return (
    <section id="tarifs" className="relative px-4 py-20 sm:px-6">
      <Aura taille="min(560px, 82vw)" className="left-1/2 top-[10%] -translate-x-1/2" />

      <div className="relative z-10 mx-auto max-w-[900px]">
        <div className="mx-auto max-w-[620px] text-center">
          <p className="eyebrow">Les offres</p>
          <h2 className="dsp mt-3 text-[clamp(1.9rem,6vw,2.8rem)]">
            Tout le programme est gratuit.
          </h2>
          <p className="mt-4 text-[15px] leading-7 text-mut">
            PRO ne débloque qu&rsquo;une chose : un coach qu&rsquo;on peut solliciter souvent. Le
            reste ne se paie pas.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {OFFRES.map((o) => (
            <article
              key={o.nom}
              className={`flex flex-col rounded-card p-6 ${o.phare ? 'glass iris' : 'glass'}`}
            >
              <p className="eyebrow">{o.nom}</p>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="dsp text-[40px]">{o.prix}</span>
              </div>
              <p className="mt-1 text-[13px] text-mut">{o.periode}</p>

              <p className="mt-5 text-[14px] leading-6">{o.resume}</p>

              <ul className="mt-5 flex flex-col gap-3">
                {o.points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-[14px] leading-6 text-mut">
                    <Coche />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>

              {/* `mt-auto` : les deux boutons s'alignent malgre des listes
                  de longueurs differentes. */}
              <div className="mt-auto pt-7">
                <Link
                  href="/login?inscription=1"
                  className={`btn w-full ${o.phare ? 'btn-solid' : 'btn-ghost'}`}
                >
                  {o.cta}
                </Link>
              </div>
            </article>
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-[38rem] text-center text-[13.5px] leading-7 text-mut">
          <b className="text-text">Aucune carte n&rsquo;est demandée pour l&rsquo;essai.</b> À son
          terme, tu repasses automatiquement sur l&rsquo;offre gratuite si tu ne t&rsquo;abonnes
          pas. Rien ne se déclenche sans que tu l&rsquo;aies choisi.
        </p>
      </div>
    </section>
  )
}

function Coche() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-[5px] shrink-0 text-text"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" opacity="0.35" />
      <path d="m8.2 12.4 2.6 2.6 5-5.6" />
    </svg>
  )
}

function Pied() {
  return (
    <footer className="relative z-10 border-t border-line px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-[1120px] flex-col items-center gap-4 text-center">
        <LogoMark size={26} />
        <p className="text-[12.5px] leading-6 text-dim">
          Tes données d&rsquo;entraînement, tes photos et tes mesures ne sont visibles que par toi.
        </p>
        <Link href="/login" className="text-[13px] text-mut underline underline-offset-4">
          Se connecter
        </Link>
      </div>
    </footer>
  )
}
