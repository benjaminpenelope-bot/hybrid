# HYBRID

PWA d'entraînement hybride mono-utilisateur : course, natation, street workout, suivi physique.
Next.js 14 (App Router, TypeScript strict) + Supabase + Tailwind.

**Règle centrale : l'app n'invente jamais une performance.** Une donnée non mesurée s'affiche
« À TESTER », sort du calcul du score, et le score est alors marqué comme partiel.

---

## Où en est le projet

| Étape | Contenu | État |
|---|---|---|
| 1 | Schéma Supabase, RLS, seed | fait |
| 2 | `lib/engine/` complet + tests Vitest | fait — 325 tests verts |
| 3 | Auth et onboarding | fait |
| 4 | Accueil, séance du jour, mode séance, résumé | fait |
| 5 | Semaine, éditeur, adaptation automatique | fait |
| 6 | Perfs, Corps, Objectifs, Récupération, Bilans | fait |
| 7 | Signaux et coach | fait |
| 8 | PWA et offline | fait |
| 9 | Strava, puis import Health | code complet, inerte |
| 10 | Objectifs et contraintes déclarés | fait |
| 11 | Couche de décision et écran Aujourd'hui | fait |

Tous les écrans sont construits.

L'étape 9 est écrite mais ne tourne pas : l'API Strava n'est ouverte qu'aux abonnés payants,
et aucun fichier Apple Health n'a encore été importé. Le code est là, jamais exercé.

### Ce qui reste

| Sujet | État |
|---|---|
| Planificateur multi-sport | partiel — la répartition de la semaine dépend de l'objectif, des sports déclarés et des jours disponibles. Reste à différencier la **prescription** de force selon l'objectif : force et hypertrophie partagent aujourd'hui le même microcycle et les mêmes séries |
| Séances de vélo | aucune. Le cyclisme est enregistré au profil, jamais programmé, et l'onboarding refuse le vélo seul |
| Ateliers HYROX (traîneau, rameur, ski erg) | non mesurables : aucun écran ne permet de les enregistrer |
| Coach en ligne | code à jour (Claude Opus 5, raisonnement adaptatif, repli serveur sur refus), mais **jamais exercé** : `ANTHROPIC_API_KEY` est vide. Le mode hors ligne, déterministe, est celui qui tourne |
| Limite d'usage du coach | aucune. Avec une vraie clé, rien n'empêche un compte d'enchaîner les requêtes — à poser avant d'ouvrir le coach en ligne au public |
| Envoi d'e-mails | SMTP Supabase partagé, plafonné autour de 4 inscriptions par heure. Bloquant pour un vrai lancement |
| Suppression de compte et export RGPD | absents. Obligatoires pour un SaaS |
| Abonnements | table `subscriptions` et `entitlement()` à écrire, avant tout branchement de paiement |

---

## Démarrer

```bash
npm install
cp .env.example .env.local   # puis renseigner les clés
npm run dev                  # http://localhost:3400
npm test                     # 325 tests
npm run typecheck
```

Node est installé via nvm (`~/.nvm/versions/node/v24.15.0/bin`) et n'est pas dans le PATH par
défaut : `export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"` avant toute commande npm.

### Variables d'environnement

| Variable | Rôle |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique, côté client |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service, serveur et seed uniquement |
| `ANTHROPIC_API_KEY` | Coach. Sans elle, le coach bascule sur ses réponses locales |
| `STRAVA_CLIENT_ID` / `STRAVA_CLIENT_SECRET` | OAuth Strava |
| `STRAVA_VERIFY_TOKEN` | Jeton vérifié par Strava à la création du webhook |
| `TOKEN_ENCRYPTION_KEY` | Clé AES-256 (32 octets base64) chiffrant les tokens en base |
| `NEXT_PUBLIC_SITE_URL` | Base des redirections OAuth |

### Migrations

Le projet est lié à `hzdlbtucxuzkwhhdrhoo` (région Paris). Pour repartir de zéro ailleurs :

```bash
supabase link --project-ref <ref>
supabase db push
```

Quatre migrations, dans l'ordre :

1. `..._schema.sql` — enums, tables, index, `updated_at`
2. `..._rls.sql` — RLS sur les dix tables, plus le verrou sur les tokens Strava
3. `..._storage.sql` — bucket privé `progress-photos` et ses policies
4. `..._swim_benchmark.sql` — repère `swim_continuous`, matériel, temps par séance, volume de base

### Seed

```bash
npm run seed -- ton@email.fr
```

Recrée l'historique réel de référence : 5 séances réalisées, 83 kg, un seul repère de force
(50 squats, marqué partiel), aucun repère haut du corps testé. Idempotent — il efface les
données de l'utilisateur cible avant de réécrire. Nécessite que le compte existe déjà dans
`auth.users` : connecte-toi une première fois avant de seeder.

---

## Auth et onboarding

Connexion par lien magique, plus Apple et Google si les fournisseurs sont activés sur le projet
Supabase. Le `middleware.ts` rafraîchit la session à chaque requête et garde toutes les routes
sauf `/login` et `/auth` : sans lui, un token expiré ne serait renouvelé qu'au prochain appel
client et un Server Component verrait un utilisateur déconnecté.

L'onboarding pose cinq séries de questions — course, natation, barre, physique, disponibilité —
et la Server Action `completeOnboarding` en tire :

- le profil (jour de repos, doublés, date de course, matériel, temps par séance) ;
- la première pesée ;
- les repères déclarés, avec la distinction qui compte : « j'en fais au moins X » devient un
  repère **partiel**, « mon max testé est X » un repère plein, et « je ne sais pas » ne crée
  **aucune ligne** — le repère restera « À TESTER » ;
- huit semaines de séances, générées à partir du volume de course réel.

Un nouvel onboarding remplace les séances à venir, jamais l'historique.

Tant qu'aucun projet Supabase n'est configuré, l'app affiche un écran qui dit ce qui manque,
plutôt qu'une page blanche ou une fausse démo.

---

## Coach

Route serveur uniquement (`app/api/coach/route.ts`), modèle `claude-sonnet-4-6`, réponse
streamée en NDJSON. La clé API ne quitte jamais le serveur.

**Aucune écriture sans confirmation.** Le coach dispose de quatre outils — `adjust_session`,
`postpone_session`, `log_session`, `set_benchmark` — mais la route ne les exécute jamais. Un
appel d'outil devient une **proposition** affichée à l'athlète, avec le détail de ce qui va
changer. Il confirme ou refuse. L'entrée est validée par Zod deux fois : à l'affichage, puis à
nouveau dans la Server Action, parce que la première validation ne protège de rien si le client
envoie autre chose.

Le contexte transmis reprend la règle du projet : un repère jamais mesuré part en « À TESTER »
plutôt qu'en zéro, une récupération non mesurée part en « non mesurée » plutôt qu'en 65, et le
ratio de charge est accompagné de sa fiabilité. Le modèle ne peut pas confondre une absence de
mesure avec une contre-performance.

**Repli local** sans clé API, sans réseau, ou en cas de quota dépassé : des réponses plus
courtes construites sur les mêmes données, qui citent toujours un chiffre réel. L'interface
signale qu'il s'agit d'une réponse locale.

Le prompt système est stable d'un appel à l'autre et marqué `cache_control` ; le contexte
variable voyage dans le dernier tour utilisateur, pour ne pas invalider le cache à chaque
requête.

---

## Sécurité des données

- RLS activée sur les dix tables, policies `select` / `insert` / `update` / `delete` en
  `user_id = auth.uid()` (`id = auth.uid()` pour `profiles`).
- Bucket `progress-photos` privé, arborescence `<user_id>/<fichier>`, lecture par URL signée.
- Table `integrations` : les droits sont **révoqués** pour `anon` et `authenticated`. La RLS
  isolerait les utilisateurs entre eux, mais n'empêcherait pas l'athlète de lire son propre
  token depuis le navigateur. Le client ne voit que la fonction `strava_status()`, qui rend un
  booléen de connexion sans jamais exposer de token. Les tokens sont chiffrés
  applicativement (AES-256-GCM, `TOKEN_ENCRYPTION_KEY`) avant insertion.

---

## Le moteur — `lib/engine/`

Modules purs, sans React ni Supabase. Chaque fonction prend un état et **la date du jour en
paramètre explicite** : aucune horloge globale, donc tout est testable et rejouable.

| Module | Contenu |
|---|---|
| `types.ts` | Types partagés — `AthleteState`, `Session`, `Scores`, `Recovery` |
| `date.ts` | Arithmétique de dates en `YYYY-MM-DD`, calculée en UTC |
| `math.ts` | `clamp`, `sum`, `half`, allures |
| `aggregate.ts` | `agg()` — moyenne pondérée qui exclut les composantes non mesurées |
| `program.ts` | Volume, phases, microcycle, contenu des séances, report |
| `load.ts` | sRPE, séries 7 / 28 jours, ratio aigu-chronique |
| `recovery.ts` | Score 0-100 et zones GREEN / YELLOW / RED |
| `scoring.ts` | Sous-scores pondérés et couverture |
| `alerts.ts` | Les dix règles de signaux automatiques |
| `adapt.ts` | Adaptation automatique après validation d'une séance |
| `prs.ts` | Détection des records et paliers street |
| `summary.ts` | Comparaison d'une séance à la précédente du même type |
| `perf.ts` | Statistiques running, natation et street |
| `goals.ts` | Objectifs 12 / 6 / 3 mois et semaine, avec progression réelle |
| `review.ts` | Bilans 7 et 30 jours, comparés à la période précédente |
| `marathon.ts` | Verdict marathon et évaluation du calendrier, calculés |
| `advice.ts` | Conseils natation et bilan, déduits des données |

### Microcycle

Les jours sont exprimés en décalage par rapport au jour de repos du profil : déplacer le repos
déplace tout le microcycle.

| Décalage | Séance (par défaut, sans doublé) |
|---|---|
| J+0 | Repos complet |
| J+1 | Street haut du corps — 50 min |
| J+2 | Endurance fondamentale + bloc jambes 12 min enchaîné |
| J+3 | Natation technique |
| J+4 | Footing souple |
| J+5 | Natation endurance |
| J+6 | Sortie longue |

Avec `allow_doubles = true`, J+5 redevient une séance `LOWER` complète de 45 min doublée de la
natation endurance, et le bloc jambes disparaît du footing de J+2.

### Volume de course

`weekVolume(w, base) = base × 1.08^(w-1)`, deload à -30 % toutes les 4 semaines, arrondi au
demi-km. Répartition : footing souple 30 %, endurance fondamentale 28 %, sortie longue le reste.

`base` est le volume de la première semaine, propre à chaque athlète, calculé par
`baseWeeklyKm(volume actuel)` : jamais plus de 10 % au-dessus de ce qu'il court déjà, avec un
plancher à 8 km pour qui ne court pas encore. C'est la seule façon d'éviter qu'un débutant à
5 km par semaine ne se retrouve à 15 km dès la première semaine — soit exactement le saut de
charge que l'app passe son temps à signaler.

Phases sur compteur de semaines : BASE 1-12, BUILD 13-26, SPECIFIC 27-42, TAPER 43-45, RACE.
Si `race_date` est renseignée, les phases se calent sur elle (TAPER 3 semaines, SPECIFIC 16,
BUILD 14) et `raceFeasibility()` dit franchement si le temps manque — il faut 19 semaines
minimum pour une phase spécifique complète plus l'affûtage.

### Score

| Sous-score | Poids |
|---|---|
| Running | 28 % |
| Natation | 20 % |
| Physique | 14 % |
| Street | 12 % |
| Force | 10 % |
| Endurance | 10 % |
| Récupération | 6 % |

Une composante non mesurée vaut `null` : elle sort de la moyenne pondérée et réduit la
couverture. `missing` est la part du score qui ne repose sur aucune donnée réelle. Sur
l'historique de référence, `missing` vaut 23 %.

### Ratio aigu / chronique

La charge chronique est **normalisée sur l'historique réellement disponible** (`span` borné
entre 7 et 28 jours). Sans cela, une première semaine de données produirait un faux rouge : sept
jours de charge comparés à une moyenne calculée sur vingt-huit. Tant que `span < 14`, le ratio
est marqué `reliable: false` et la règle de signal correspondante ne se déclenche pas.

### Les dix signaux

Chacun est adossé à une donnée mesurée, et ne se déclenche pas quand cette donnée manque.

1. `acwr` — ratio de charge > 1,5 (critique), > 1,3 (avertissement), < 0,8 (information)
2. `streak` — 6 jours enchaînés (avertissement), 8 (critique)
3. `pain` — douleur relevée dans les 3 derniers jours (critique)
4. `sleep` — moyenne sous 6 h 30 sur au moins deux relevés
5. `fatigue` — fatigue ≥ 8 sur le dernier relevé
6. `weight_rate` — prise > 0,25 kg/semaine sur deux pesées espacées d'au moins 7 jours
7. `run_jump` — volume de course en hausse de plus de 30 % d'une semaine sur l'autre
8. `swim_stagnation` — distance continue inchangée depuis 21 jours, sur au moins 3 séances
9. `benchmarks_missing` — repères de force jamais testés, avec la part de score en attente
10. `race_feasibility` — calendrier trop court pour la phase spécifique

Le signal `pain` ne pose aucun diagnostic : il recommande de réduire l'activité et de consulter.

### Adaptation automatique

Après validation d'une séance : RPE ≥ 8, fatigue ≥ 8 ou douleur → les 2 séances suivantes à
85 %. RPE ≤ 4 et fatigue ≤ 4 sans douleur → les 3 suivantes à 105 %. Le jour de repos n'est
jamais touché, et une séance déjà adaptée est laissée telle quelle : les facteurs ne se
composent pas.

---

## Prose calculée plutôt qu'écrite d'avance

Le prototype affichait sur Perfs et Bilan des paragraphes rédigés à la main : « il te manque le
volume, pas la vitesse », « Meilleur 10 km : jamais couru », « passer de 10 à 45 km ». Justes le
jour de la capture, faux la semaine suivante — et incompatibles avec la règle du projet.

`marathon.ts` et `advice.ts` recalculent ces textes : le verdict marathon, les cibles de la phase
en cours, l'allure cible, l'arbitrage entre prise de poids et chrono, le conseil technique de
natation, le blocage numéro un, et les trois blocs du bilan. La forme du prototype est conservée
au pixel près ; le fond suit les données.

Le point le plus important : quand l'allure n'a jamais été mesurée sur une sortie d'au moins
3 km, le verdict **refuse de dire ce qui manque** au lieu d'affirmer que c'est le volume. Un test
vérifie explicitement que la phrase du prototype n'apparaît pas dans ce cas.

---

## Écarts assumés par rapport au prototype

Le prototype `reference/athlete-os.jsx` fait foi pour le calcul. Quatre points s'en écartent,
tous dans le sens de la règle « aucune performance inventée » :

1. **Muscle-up.** Le prototype attribue 25 points en dur quand le nombre de muscle-ups n'est pas
   testé. Ici, la composante vaut `null` et s'affiche « À TESTER ». Un muscle-up acquis mais non
   compté doit être enregistré comme repère partiel à l'onboarding, pas supposé par le code.
2. **Distance continue en natation.** Le prototype note 0 quand elle est inconnue. Ici elle vaut
   `null` : jamais nagé et nagé 0 m ne sont pas la même information.
3. **Vitesse de prise de poids.** Exclue tant qu'il n'y a qu'une seule pesée — une vitesse
   calculée sur un point unique n'est pas une mesure.
4. **Ratio de charge et jours consécutifs.** Exclus du score de récupération quand aucune séance
   n'est enregistrée, au lieu de valoir 100 par défaut.
5. **Zone de récupération sans donnée.** Le prototype affichait toujours une zone. Ici, quand
   aucune composante n'est mesurée, la zone vaut `UNKNOWN` : l'écran affiche « — » et « Non
   mesurée » au lieu d'un score de 65 qui tombait dans la bande jaune et conseillait de baisser
   l'intensité. Un conseil tiré de zéro donnée est exactement ce que ce projet refuse. La
   récupération sort aussi du score global tant qu'elle n'est pas mesurée, comme n'importe
   quelle autre composante absente.
6. **Repères partiels.** Un repère déclaré « j'en fais au moins X » compte dans le score mais
   reste signalé comme en attente de test : le maximum réel n'a jamais été atteint, et le score
   le sous-estime tant qu'il ne l'est pas.

Le microcycle suit la table de spécification (aucun doublé par défaut, bloc jambes enchaîné au
footing) et non celui du prototype, qui plaçait un doublé le mardi.

Enfin, le volume de première semaine est devenu un paramètre au lieu d'une constante à 15 km.
Le prototype ne servait qu'un athlète, dont la base était connue ; l'app en sert plusieurs.

---

## Tests

```bash
npm test
```

325 tests sur `program`, `decide`, `summary`, `perf`, `goals`, `review`, `marathon`, `advice`, `scoring`, `load`, `recovery`, `adapt`, `alerts`, `prs`, avec les cas
limites exigés : historique vide, une seule séance, benchmarks absents, semaine de deload,
première semaine de données (pas de faux rouge sur le ratio de charge).

---

## Design

Tokens du prototype, repris en variables CSS dans `app/globals.css` et en couleurs Tailwind.
Barlow Condensed en display et pour tous les chiffres (`tabular-nums`), Inter en texte courant.
Contenu plafonné à 520 px et centré, cartes à 16 px de rayon, cibles tactiles de 44 px,
`prefers-reduced-motion` respecté. La couleur n'identifie qu'une discipline ou un niveau
d'alerte, jamais une décoration.
