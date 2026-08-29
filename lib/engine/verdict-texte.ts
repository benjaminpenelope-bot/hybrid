import type { Verdict } from './decide'

/**
 * TRADUCTION DU VERDICT
 *
 * Transforme une décision en deux phrases : où tu en es, et ce que ça change.
 * Déterministe, sans modèle de langage — c'est ce qui permet à l'écran de
 * s'afficher instantanément et de dire la même chose avec ou sans clé API.
 *
 * Règle de rédaction : aucun chiffre technique dans la phrase. Pas de ratio,
 * pas d'unité de charge, pas de score sur 100. « Ta charge est élevée » plutôt
 * que « ratio 1,62 ». Les valeurs restent dans les preuves du verdict, pour qui
 * veut vérifier — mais elles n'ouvrent pas l'écran.
 */

export interface TexteVerdict {
  /** Où tu en es, en une phrase. */
  titre: string
  /** Ce que ça change concrètement. */
  detail: string
  /**
   * Avertissement de santé, présent uniquement quand une douleur est en jeu.
   * L'application ne pose aucun diagnostic : elle allège et renvoie vers un
   * professionnel.
   */
  sante: string | null
}

const SANTE =
  'Cette application ne pose aucun diagnostic. Si la douleur augmente à l’effort ou dure plus de quelques jours, consulte un professionnel de santé.'

/** Pourcentage lisible : 0.85 devient « 15 % ». */
function ecart(ampleur: number | null): string {
  if (ampleur === null) return ''
  return `${Math.round(Math.abs(1 - ampleur) * 100)} %`
}

export function verdictTexte(v: Verdict): TexteVerdict {
  const douleur = v.preuves.some((p) => p.quoi === 'Douleur signalée')

  switch (v.action) {
    case 'repos':
      return {
        titre: 'Aujourd’hui, tu coupes.',
        detail:
          'Reprendre la séance telle quelle coûterait plus qu’elle ne rapporterait. Marche ou repos complet.',
        sante: douleur ? SANTE : null,
      }

    case 'deplacer':
      return {
        titre: 'Tu enchaînes depuis trop longtemps.',
        detail: 'Je décale la séance à demain et je te laisse couper aujourd’hui.',
        sante: null,
      }

    case 'alleger':
      return douleur
        ? {
            titre: 'Tu as signalé une douleur.',
            detail: `La séance est allégée de ${ecart(v.ampleur)}. Arrête si ça réveille la zone concernée.`,
            sante: SANTE,
          }
        : {
            titre: 'Tu as beaucoup sollicité ton corps.',
            detail: `On garde la séance mais on retire ${ecart(v.ampleur)}. Cherche la régularité, pas l’intensité.`,
            sante: null,
          }

    case 'progresser':
      return {
        titre: 'Tu récupères bien, et il reste de la marge.',
        detail: `On monte de ${ecart(v.ampleur)} sur cette séance.`,
        sante: null,
      }

    case 'maintenir': {
      /*
       * Trois « maintenir » très différents : un jour de repos prévu, une
       * séance validée par les données, et une séance qu'on applique faute de
       * savoir. Les confondre reviendrait à faire passer une ignorance pour
       * une confirmation.
       */
      const repos = v.preuves.some((p) => p.valeur === 'Repos programmé')
      if (repos) {
        return {
          titre: 'Repos prévu aujourd’hui.',
          detail: 'Il fait partie du programme au même titre qu’une séance. Prends-le.',
          sante: null,
        }
      }
      if (v.sessionId === null) {
        return {
          titre: 'Rien de programmé aujourd’hui.',
          detail: 'Aucune séance n’est prévue. Tu peux en ajouter une depuis la semaine.',
          sante: null,
        }
      }
      // Sur le libelle, pas sur le texte : reformuler une preuve ne doit rien casser.
      const nonMesure = v.preuves.some((p) => p.quoi === 'Récupération')
      return nonMesure
        ? {
            titre: 'Séance prévue, telle quelle.',
            detail:
              'Je ne sais pas comment tu te sens aujourd’hui : renseigne ton sommeil et ta fatigue, et je pourrai adapter.',
            sante: null,
          }
        : {
            titre: 'Tu récupères bien aujourd’hui.',
            detail: 'Rien ne justifie de toucher à la séance. Applique-la comme prévu.',
            sante: null,
          }
    }
  }
}
