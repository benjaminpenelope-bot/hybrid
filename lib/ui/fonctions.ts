/**
 * FONCTIONS EN VEILLE
 *
 * Ces chantiers sont écrits, testés et branchés, mais aucun ne tient encore
 * sa promesse de bout en bout. Ils sont donc masqués plutôt que supprimés :
 * une option qui ne marche pas coûte plus cher qu'une option absente, parce
 * qu'elle fait douter du reste.
 *
 * Ce fichier est l'unique interrupteur. Remettre une fonction en service tient
 * en un `true`, et rien n'aura été perdu entre-temps — ni le code, ni les
 * migrations, ni les tests.
 */

export const FONCTIONS = {
  /**
   * Athlete Score et niveaux.
   *
   * Le calcul tient, mais le chiffre ne veut rien dire pour celui qui le lit,
   * et sept defauts l'expliquent. Trois sont structurels :
   *
   *   — il melange ce qu'on peut faire et ce qu'on a fait cette semaine. Le
   *     volume sur sept jours pese trente-cinq pour cent du sous-score
   *     course, alors que le programme prescrit lui-meme une decharge toutes
   *     les quatre semaines. Le niveau baisse donc parce que le plan a dit de
   *     lever le pied ;
   *
   *   — les poids ne dependent pas de l'objectif. Qui vise la force est note
   *     a vingt-huit pour cent sur la course ;
   *
   *   — un zero mesure et une absence de mesure sont traites a l'envers l'un
   *     de l'autre. Ne pas courir donne `km7 = 0`, un zero reel qui fait
   *     tomber le sous-score, la ou un repere jamais teste sort proprement du
   *     calcul.
   *
   * Un chiffre qu'on ne peut pas expliquer coute plus cher qu'un chiffre
   * absent : il fait douter de tout ce qui l'entoure. Il disparait donc de
   * l'ecran, du coach et des signaux, en attendant d'etre refait.
   *
   * `computeScores`, `levelOf` et leurs tests restent intacts.
   */
  athleteScore: false,

  /**
   * Compteur de pas.
   *
   * Le moteur, la colonne, la carte et l'import sont faits. Ce qui manque est
   * en amont : aucune source ne les alimente encore automatiquement. Un
   * compteur qui affiche « non mesuré » sept jours sur sept ne compte rien.
   */
  pas: false,

  /**
   * Import automatique par jeton.
   *
   * L'adresse fonctionne — éprouvée sur l'authentification, les formats de
   * nombres, les dates et le rapprochement des séances. C'est le raccourci iOS
   * qui n'est pas fini, et il ne sert aujourd'hui qu'à envoyer des pas.
   */
  importAutomatique: false,

  /**
   * Dépôt d'un export Apple Health.
   *
   * Fonctionne, mais reste un import manuel : il faut demander l'export à
   * Apple, attendre son courriel, puis déposer un fichier de plusieurs
   * centaines de mégaoctets. Ce n'est pas ce qu'on veut proposer.
   */
  appleHealth: false,

  /**
   * Connexion Strava.
   *
   * Le code est complet — OAuth, webhook, synchronisation qui dédoublonne et
   * met à jour. Mais Strava n'accorde plus d'accès à son interface aux
   * nouvelles applications : les identifiants n'existent pas, et l'écran ne
   * peut qu'annoncer qu'il n'est pas configuré.
   */
  strava: false,
} as const
