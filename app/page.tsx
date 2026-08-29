import type { Metadata } from 'next'
import Link from 'next/link'
import { LogoMark } from '@/components/logo'

export const metadata: Metadata = {
  title: 'POLYTRAIN · Un entraîneur. Tous tes entraînements.',
  description:
    "L'entraîneur intelligent qui adapte ton programme à ton objectif, tes sports, ta charge et ta récupération.",
}

/*
 * `bientot` marque ce que l'app enregistre sans encore le programmer. Annoncer
 * un sport que le generateur ne sait pas produire ferait promettre a la page
 * ce que l'application ne tient pas.
 */
const sports = [
  { nom: 'Course', bientot: false },
  { nom: 'Musculation', bientot: false },
  { nom: 'Natation', bientot: false },
  { nom: 'HYROX', bientot: false },
  { nom: 'Cyclisme', bientot: true },
] as const

const steps = [
  ['01', 'Définis ton objectif', 'Marathon, HYROX, force, muscle ou condition physique.'],
  ['02', 'POLYTRAIN construit ton programme', 'Un programme cohérent avec tes sports, ton niveau et ton agenda.'],
  ['03', 'Entraîne-toi', 'Tu sais quoi faire, pourquoi tu le fais, et à quelle intensité.'],
  ['04', 'L’entraîneur adapte ton programme', 'Fatigue, charge, récupération et progression modifient la suite.'],
] as const

const appScreens = [
  ['AUJOURD’HUI', 'Sache exactement quoi faire.', 'Sortie tempo', '42 min · intensité 3/5'],
  ['SEMAINE', 'Visualise ton programme.', '6 séances', '3 course · 1 musculation · 2 natation'],
  ['PERFORMANCES', 'Comprends ta progression.', '+12 %', 'charge maîtrisée sur 28 jours'],
  ['ENTRAÎNEUR', 'Adapte ton entraînement.', 'Réduire', 'fatigue élevée détectée'],
] as const

const goals = [
  'Préparer un marathon',
  'Préparer un HYROX',
  'Développer sa force',
  'Construire du muscle',
  'Améliorer sa condition physique',
  'Développer son endurance',
] as const

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-bg text-text">
      <section className="relative min-h-screen px-3 py-3 sm:px-5 sm:py-5">
        <LandingGlow />
        <Header />

        <div className="relative mx-auto grid min-h-[calc(100vh-108px)] w-full max-w-[1220px] grid-cols-1 items-center gap-12 overflow-hidden rounded-[30px] border border-[#924dde1a] bg-bg2 px-5 pb-12 pt-8 shadow-[0_28px_90px_rgba(0,0,0,0.65)] sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,0.85fr)] lg:px-10 lg:pb-16">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute left-[-16%] top-[27%] h-[170px] w-[72%] -rotate-[15deg] bg-brand/45 blur-[50px]" />
            <div className="absolute right-[-18%] top-[26%] h-[150px] w-[62%] rotate-[18deg] bg-street/35 blur-[56px]" />
            <div className="absolute bottom-[-18%] left-[-8%] h-[42%] w-[116%] rounded-[50%] border-t border-[#924dde40]" />
          </div>
          <div className="relative z-10">
            <div className="mb-5 flex flex-wrap gap-2">
              {sports.map((sport) => (
                <span
                  key={sport.nom}
                  className="rounded-full border border-[#924dde33] bg-white/[0.035] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.13em] text-[#EFF1F3]"
                >
                  {sport.nom}
                </span>
              ))}
            </div>

            <p className="eyebrow text-brand">Un entraîneur. Tous tes entraînements.</p>
            {/*
              Taille fluide plutôt que trois paliers fixes. Le mot le plus long,
              « ENTRAÎNEMENTS. », mesure 6,34 px de large par pixel de police :
              à 70 px il fait 444 px et débordait toute fenêtre de téléphone,
              rogné en silence par le `overflow-hidden` du parent. 13vw le garde
              dans le cadre de 375 px jusqu'au grand écran, et le plafond de
              7rem préserve la taille voulue en desktop.
            */}
            <h1 className="dsp mt-4 max-w-[11ch] text-[clamp(2.5rem,13vw,7rem)] leading-[0.9] text-white">
              Un entraîneur.
              <br />
              Tous tes entraînements.
            </h1>
            <p className="mt-6 max-w-[560px] text-[18px] leading-8 text-mut sm:text-[20px]">
              L’entraîneur intelligent qui adapte ton entraînement à ta vraie vie.
            </p>
            <p className="mt-4 max-w-[620px] text-[14px] leading-7 text-mut sm:text-[15px]">
              POLYTRAIN ne se contente pas d’enregistrer tes séances. Il comprend ton objectif,
              tes entraînements, ta charge et ton état actuel pour te dire quoi faire aujourd’hui.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-brand px-7 font-display text-[15px] font-bold uppercase tracking-[0.09em] text-white shadow-[0_0_34px_rgba(146,77,222,0.38)] transition-transform active:scale-[0.98]"
              >
                Commencer gratuitement
              </Link>
              <a
                href="#produit"
                className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-white/12 bg-white/[0.04] px-7 font-display text-[15px] font-bold uppercase tracking-[0.09em] text-text backdrop-blur-xl transition-colors hover:bg-white/[0.08]"
              >
                Découvrir POLYTRAIN
              </a>
            </div>
          </div>

          <HeroVisual />
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1180px] px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Comment ça marche" title="Ton objectif. Ton programme. Ton adaptation." />
        <div className="mt-8 grid gap-3 md:grid-cols-4">
          {steps.map(([number, title, text], index) => (
            <article
              key={number}
              className={`rounded-card border p-5 ${
                index === 3
                  ? 'border-[#924dde66] bg-brand/10 shadow-[0_0_60px_rgba(146,77,222,0.16)]'
                  : 'border-white/10 bg-white/[0.045]'
              }`}
            >
              <div className="num text-[15px] text-dim">{number}</div>
              <h3 className="dsp mt-5 text-[25px] leading-none">{title}</h3>
              <p className="mt-3 text-[13px] leading-6 text-mut">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-card">
        <div className="mx-auto grid w-full max-w-[1180px] gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.8fr_1fr] lg:px-8">
          <div>
            <p className="eyebrow text-brand">Coaching adaptatif</p>
            <h2 className="dsp mt-4 text-[48px] leading-[0.95] sm:text-[68px]">
              Ton programme ne sait pas que tu as mal dormi.
              <br />
              <span className="text-brand">POLYTRAIN, oui.</span>
            </h2>
          </div>
          <AdaptationFlow />
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1180px] px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Les 5 sports" title="Tout ton entraînement. Au même endroit." />
        <p className="mt-4 max-w-[720px] text-[15px] leading-7 text-mut">
          Un marathonien peut aussi faire de la musculation et de la natation. POLYTRAIN construit une
          stratégie globale au lieu de traiter chaque discipline séparément. Le vélo est suivi dans
          ton profil ; ses séances arriveront avec le planificateur multi-sport.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {sports.map((sport) => (
            <article key={sport.nom} className="rounded-[22px] border border-white/10 bg-[radial-gradient(circle_at_30%_10%,rgba(146,77,222,0.15),rgba(255,255,255,0.035)_44%,rgba(255,255,255,0.02))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <div className="h-2 w-10 rounded-full bg-brand" />
              <h3 className="dsp mt-8 text-[28px]">{sport.nom}</h3>
              {sport.bientot && (
                <p className="eyebrow mt-2 text-[9.5px] text-mut">Suivi, pas encore programmé</p>
              )}
            </article>
          ))}
        </div>
      </section>

      <section id="produit" className="mx-auto w-full max-w-[1180px] px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="L’application" title="Chaque écran sert une décision." />
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {appScreens.map(([label, benefit, value, sub]) => (
            <article key={label} className="rounded-[22px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.025))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
              <p className="eyebrow text-[9.5px]">{label}</p>
              <p className="mt-2 text-[13px] text-mut">{benefit}</p>
              <div className="mt-8 rounded-[18px] border border-white/10 bg-black/30 p-4">
                <div className="dsp text-[26px]">{value}</div>
                <div className="mt-2 text-[12px] text-dim">{sub}</div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-[1180px] gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.85fr_1fr] lg:px-8">
        <SectionHeader eyebrow="Pour qui ?" title="Un seul entraîneur pour plusieurs objectifs." />
        <div className="grid gap-3 sm:grid-cols-2">
          {goals.map((goal) => (
            <div key={goal} className="rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-4 text-[14px] text-mut shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              {goal}
            </div>
          ))}
        </div>
      </section>

      <section id="tarifs" className="mx-auto w-full max-w-[1180px] px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Tarifs" title="Commence gratuitement. Passe Pro quand tu veux." />

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <PricingCard
            name="POLYTRAIN"
            price="0 €"
            periode="pour toujours"
            resume="De quoi suivre ton entraînement et voir où tu en es."
            features={[
              'Suivi des entraînements et historique',
              'Statistiques basiques',
              'Premières recommandations du coach IA',
              'Connexion aux principales plateformes',
            ]}
            limite="Fonctionnalités limitées sur les intégrations."
            cta="Commencer gratuitement"
          />
          <PricingCard
            name="POLYTRAIN PRO"
            price="9,99 €"
            periode="par mois, ou 79,99 € par an"
            resume="L'entraîneur complet, qui construit et adapte ton programme."
            features={[
              'Coach IA complet',
              'Programme personnalisé',
              'Adaptation automatique des séances',
              'Analyse des performances et de la récupération',
              'Objectifs personnalisés et préparation aux compétitions',
              'Toutes les intégrations disponibles',
            ]}
            cta="Essayer 14 jours"
            highlighted
          />
        </div>

        <p className="mt-6 text-[14px] leading-7 text-mut">
          <b className="text-text">14 jours d&rsquo;essai gratuit de POLYTRAIN PRO, sans carte bancaire.</b>{' '}
          À la fin de l&rsquo;essai, tu repasses automatiquement sur l&rsquo;offre gratuite si tu ne
          t&rsquo;abonnes pas. Rien ne se déclenche sans que tu l&rsquo;aies choisi.
        </p>

        <article className="mt-10 rounded-[22px] border border-dashed border-white/15 bg-white/[0.035] p-6">
          <p className="eyebrow">Témoignages</p>
          <h2 className="dsp mt-4 text-[36px] leading-none">Preuves sociales à ajouter.</h2>
          <p className="mt-4 max-w-[640px] text-[13px] leading-6 text-mut">
            Placeholder volontaire : aucun faux avis, aucun chiffre inventé.
          </p>
        </article>
      </section>

      <section className="relative px-4 py-20 text-center sm:px-6">
        <LandingGlow />
        <div className="relative z-10 mx-auto max-w-[780px]">
          <h2 className="dsp text-[56px] leading-[0.92] sm:text-[82px]">
            Arrête de deviner.
            <br />
            Commence à t’entraîner intelligemment.
          </h2>
          <Link
            href="/login"
            className="mt-8 inline-flex min-h-[52px] items-center justify-center rounded-full bg-brand px-7 font-display text-[15px] font-bold uppercase tracking-[0.09em] text-white shadow-[0_0_34px_rgba(146,77,222,0.38)] transition-transform active:scale-[0.98]"
          >
            Commencer gratuitement
          </Link>
        </div>
      </section>
    </main>
  )
}

function Header() {
  return (
    <header className="relative z-20 mx-auto flex h-20 w-full max-w-[1220px] items-center justify-between px-5 sm:px-8 lg:px-10">
      <Link href="/" className="flex items-center gap-2.5 rounded-full bg-black/20 pr-3" aria-label="POLYTRAIN">
        <LogoMark size={30} />
        <span className="dsp text-[22px] tracking-[0.06em]">POLYTRAIN</span>
      </Link>
      <nav className="hidden items-center gap-2 rounded-full border border-[#924dde33] bg-black/40 p-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-mut backdrop-blur-xl md:flex">
        <a href="#produit" className="rounded-full px-5 py-2.5 transition-colors hover:bg-brand hover:text-white">
          Produit
        </a>
        <Link href="/login" className="rounded-full px-5 py-2.5 transition-colors hover:bg-brand hover:text-white">
          Connexion
        </Link>
      </nav>
    </header>
  )
}

function HeroVisual() {
  return (
    <div className="relative z-10 mx-auto flex min-h-[560px] w-full max-w-[500px] items-end justify-center lg:mx-0">
      <div className="pointer-events-none absolute inset-x-0 bottom-2 h-[88%]" aria-hidden>
        <div className="absolute bottom-0 left-1/2 h-[520px] w-[260px] -translate-x-1/2 rounded-t-[130px] bg-[linear-gradient(90deg,rgba(255,255,255,0.04),rgba(255,255,255,0.22),rgba(255,255,255,0.02))] opacity-70 blur-[1px]" />
        <div className="absolute bottom-[78px] left-[49%] h-[150px] w-[200px] -translate-x-1/2 rotate-[-24deg] rounded-full border border-[#924dde66]" />
        <div className="absolute bottom-[220px] left-[46%] h-[160px] w-[78px] -translate-x-1/2 rounded-full border border-white/20 bg-white/[0.04]" />
        <div className="absolute bottom-[362px] left-[48%] h-[78px] w-[58px] -translate-x-1/2 rounded-full border border-white/25 bg-white/[0.08]" />
        <div className="absolute bottom-[286px] left-[27%] h-[156px] w-[22px] rotate-[35deg] rounded-full border border-[#924dde4d]" />
        <div className="absolute bottom-[260px] right-[24%] h-[190px] w-[22px] rotate-[-42deg] rounded-full border border-[#924dde4d]" />
        <div className="absolute bottom-[70px] left-[31%] h-[230px] w-[24px] rotate-[13deg] rounded-full border border-white/15" />
        <div className="absolute bottom-[70px] right-[32%] h-[230px] w-[24px] rotate-[-11deg] rounded-full border border-white/15" />
        <div className="absolute bottom-[245px] left-[20%] h-px w-[310px] rotate-[-18deg] bg-[#924dde80]" />
        <div className="absolute bottom-[330px] right-[15%] h-px w-[260px] rotate-[24deg] bg-[#924dde66]" />
      </div>
      <HeroMockup />
    </div>
  )
}

function HeroMockup() {
  return (
    <div className="relative z-10 mb-2 ml-auto w-full max-w-[360px]">
      <div className="absolute -inset-8 rounded-full bg-brand/18 blur-3xl" />
      <div className="relative rounded-[36px] border border-[#924dde30] bg-black/35 p-2 shadow-2xl shadow-black/60 backdrop-blur-xl">
        <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.1),rgba(12,13,13,0.88)_42%,rgba(0,0,0,0.94))] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow text-[9px]">Aujourd’hui</p>
              <h2 className="dsp mt-1 text-[30px]">Séance adaptée</h2>
            </div>
            <div className="num rounded-full border border-[#924dde59] bg-brand/10 px-3 py-1.5 text-[13px] text-brand">
              87
            </div>
          </div>

          <div className="mt-5 rounded-[22px] border border-white/10 bg-black/35 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div className="mb-3 flex items-center justify-between">
              <span className="rounded-full border border-[#924dde40] bg-brand/10 px-2.5 py-1 font-display text-[10px] font-semibold uppercase tracking-[0.09em] text-brand">
                Course
              </span>
              <span className="num text-[13px] text-mut">42 min</span>
            </div>
            <h3 className="dsp text-[34px] leading-none">Tempo contrôlé</h3>
            <p className="mt-3 text-[12.5px] leading-6 text-mut">
              Intensité ajustée après une charge élevée et une récupération moyenne.
            </p>
            <div className="mt-4 flex gap-1.5">
              {[0, 1, 2, 3, 4].map((bar) => (
                <span
                  key={bar}
                  className={`h-1 flex-1 rounded-full ${bar < 3 ? 'bg-brand' : 'bg-white/10'}`}
                />
              ))}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            {/* Une charge haute est un avertissement, pas la marque : le violet de
                marque ne se pose jamais sur une donnee. */}
            <MiniMetric label="Charge" value="Haute" color="var(--warn)" />
            <MiniMetric label="Récupération" value="68" color="var(--swim)" />
          </div>
        </div>
      </div>
    </div>
  )
}

function MiniMetric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/[0.04] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <p className="text-[11px] text-dim">{label}</p>
      <p className="num mt-1 text-[22px]" style={{ color }}>
        {value}
      </p>
    </div>
  )
}

function AdaptationFlow() {
  return (
    <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.025))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
        <FlowCard title="Programme initial" main="Sortie longue · 18 km" />
        <Arrow />
        <FlowCard title="Contexte" main="Charge élevée" sub="Récupération insuffisante" />
        <Arrow />
        <FlowCard title="Nouvelle séance" main="Sortie longue · 14 km" sub="Intensité réduite" accent />
      </div>
      <div className="mt-5 rounded-[18px] border border-[#924dde40] bg-brand/10 p-4">
        <p className="eyebrow text-[9.5px] text-brand">Entraîneur POLYTRAIN</p>
        <p className="mt-2 text-[13px] leading-6 text-mut">
          Objectif, programme, entraînement, données, adaptation, progression : la boucle reste
          vivante à chaque séance.
        </p>
      </div>
    </div>
  )
}

function FlowCard({
  title,
  main,
  sub,
  accent,
}: {
  title: string
  main: string
  sub?: string
  accent?: boolean
}) {
  return (
    <div className={`rounded-[18px] border p-4 ${accent ? 'border-[#924dde66] bg-brand/10' : 'border-white/10 bg-black/25'}`}>
      <p className="eyebrow text-[9px]">{title}</p>
      <p className="dsp mt-4 text-[25px] leading-none">{main}</p>
      {sub && <p className="mt-2 text-[12px] text-mut">{sub}</p>}
    </div>
  )
}

function Arrow() {
  return (
    <div className="num hidden text-center text-[22px] text-dim md:block" aria-hidden>
      →
    </div>
  )
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="eyebrow text-brand">{eyebrow}</p>
      <h2 className="dsp mt-4 max-w-[760px] text-[48px] leading-[0.95] sm:text-[64px]">{title}</h2>
    </div>
  )
}

function PricingCard({
  name,
  price,
  periode,
  resume,
  features,
  limite,
  cta,
  highlighted,
}: {
  name: string
  price: string
  periode: string
  resume: string
  features: readonly string[]
  /** Restriction de l'offre, dite franchement plutot que noyee dans la liste. */
  limite?: string
  cta: string
  highlighted?: boolean
}) {
  return (
    <article
      className={`flex flex-col rounded-card border p-6 ${
        highlighted ? 'border-[#924dde66] bg-brand/10' : 'border-white/10 bg-white/[0.04]'
      }`}
    >
      <p className={`eyebrow ${highlighted ? 'text-brand' : ''}`}>{name}</p>

      <div className="mt-5 flex items-baseline gap-2">
        <span className="dsp text-[38px] leading-none">{price}</span>
        <span className="text-[13px] text-mut">{periode}</span>
      </div>

      <p className="mt-4 text-[14px] leading-6 text-mut">{resume}</p>

      <ul className="mt-5 flex flex-col gap-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-[14px] leading-6">
            <span
              className={`mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full ${highlighted ? 'bg-brand' : 'bg-mut'}`}
              aria-hidden
            />
            {f}
          </li>
        ))}
      </ul>

      {limite && <p className="mt-4 text-[13px] leading-6 text-dim">{limite}</p>}

      {/* mt-auto sur l enveloppe : les deux boutons s alignent en bas meme si
          les listes de fonctionnalites n ont pas la meme longueur. */}
      <div className="mt-auto pt-6">
        <Link
          href="/login"
          className={`inline-flex min-h-[48px] w-full items-center justify-center rounded-[13px] font-display text-[13px] font-bold uppercase tracking-[0.09em] ${
            highlighted ? 'bg-brand text-white' : 'bg-text text-bg'
          }`}
        >
          {cta}
        </Link>
      </div>
    </article>
  )
}

function LandingGlow() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute left-[-12%] top-[8%] h-[360px] w-[360px] rounded-full bg-brand/16 blur-3xl" />
      <div className="absolute right-[-8%] top-[18%] h-[300px] w-[300px] rounded-full bg-swim/12 blur-3xl" />
      <div className="absolute bottom-[4%] left-[42%] h-[260px] w-[260px] rounded-full bg-run/10 blur-3xl" />
    </div>
  )
}
