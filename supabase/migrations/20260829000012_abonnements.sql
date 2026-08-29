-- Abonnements.
--
-- Volontairement agnostique du fournisseur. Le lancement iOS est prevu, et
-- Apple impose son propre achat integre : une table calquee sur Stripe
-- obligerait a tout refaire. Ici, `source` dit d'ou vient l'abonnement, et le
-- reste de l'application ne s'en preoccupe jamais.

do $$ begin
  create type subscription_status as enum ('essai', 'actif', 'annule', 'expire');
exception when duplicate_object then null; end $$;

do $$ begin
  -- `manuel` couvre l'essai sans carte et les gestes commerciaux.
  create type subscription_source as enum ('stripe', 'apple', 'manuel');
exception when duplicate_object then null; end $$;

create table if not exists subscriptions (
  -- Une ligne par compte : un athlete n'a qu'un abonnement a la fois. Une
  -- resiliation suivie d'un reabonnement met a jour la ligne existante.
  user_id uuid primary key references profiles on delete cascade,
  status subscription_status not null,
  source subscription_source not null,

  -- Fin de la periode couverte. C'est cette date qui fait foi, et elle seule.
  --
  -- Le retour automatique a l'offre gratuite se deduit donc de la date, il ne
  -- s'execute pas. Aucune tache planifiee ne peut oublier de tourner, et un
  -- abonnement expire ne peut pas continuer a donner acces parce qu'un cron
  -- est tombe.
  periode_fin timestamptz not null,

  -- Un seul essai par compte, definitivement. Sans ce drapeau, il suffirait
  -- de resilier et de recommencer pour rester gratuitement en PRO.
  essai_utilise boolean not null default false,

  -- Identifiant chez le fournisseur : `sub_...` chez Stripe, l'identifiant de
  -- transaction original chez Apple. Nul pour un essai sans carte.
  external_id text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table subscriptions is
  'Abonnements, tous fournisseurs confondus. Ecrit uniquement par le serveur.';
comment on column subscriptions.periode_fin is
  'Fin de la periode couverte. Le retour au gratuit se deduit de cette date, aucune tache ne l applique.';

alter table subscriptions enable row level security;

-- L'athlete lit son abonnement : il doit pouvoir voir ou il en est.
drop policy if exists "subscriptions_select_own" on subscriptions;
create policy "subscriptions_select_own" on subscriptions
  for select using (user_id = (select auth.uid()));

-- Aucune politique d'ecriture, volontairement : un compte capable de modifier
-- sa ligne s'offrirait l'abonnement payant. Seule la cle service ecrit.
