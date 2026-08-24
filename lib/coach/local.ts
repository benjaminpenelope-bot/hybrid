import { computeAlerts } from '@/lib/engine/alerts'
import { runStats, swimStats } from '@/lib/engine/perf'
import { computeRecovery, ZONES } from '@/lib/engine/recovery'
import { benchmarkValue } from '@/lib/engine/state'
import type { AthleteState, ISODate } from '@/lib/engine/types'

/**
 * REPLI LOCAL
 *
 * Sans réseau ni clé API, le coach répond quand même — à partir des mêmes
 * données, avec des réponses plus courtes. Chaque réponse cite un chiffre
 * réel : le repli ne doit pas être moins honnête que le coach en ligne.
 */

export function localAnswer(message: string, state: AthleteState, today: ISODate): string {
  const m = message.toLowerCase()
  const recovery = computeRecovery(state, today)
  const run = runStats(state, today)
  const swim = swimStats(state, today)

  if (/fatigu|crev|épuis|epuis|vidé|vide|mort/.test(m)) {
    return recovery.measured
      ? `Ton score de récupération est à ${recovery.score} (${ZONES[recovery.zone].label.toLowerCase()}), charge 7 jours ${recovery.l7} u. ${ZONES[recovery.zone].advice} Si la fatigue dure plus de trois jours, c'est un problème de sommeil ou d'alimentation, pas d'entraînement.`
      : `Tu n'as pas encore renseigné ton sommeil ni ta fatigue, donc je n'ai rien à interpréter. Va sur l'écran Récupération, remplis le relevé du jour, et je pourrai te répondre avec autre chose qu'une impression.`
  }

  if (/mal|douleur|blessu|tendon|genou|cheville|dos/.test(m)) {
    return `Arrête l'activité qui déclenche la douleur, sans « je force un peu pour voir ». Remplace par du vélo, de la nage ou du repos selon la zone. Si ça persiste plus de quelques jours, si ça réveille la nuit ou si ça s'aggrave à l'effort, consulte un professionnel de santé. Je ne pose aucun diagnostic.`
  }

  if (/30 min|peu de temps|pas le temps|court|pressé/.test(m)) {
    return `Garde les deux premiers exercices au volume prévu et supprime le reste. Sur un footing, 25 min en endurance fondamentale valent bien mieux qu'une séance sautée. Ne compense jamais en montant l'intensité.`
  }

  if (/nage|piscine|crawl|brasse|longueur/.test(m)) {
    return swim.continuous === null
      ? `Ta distance nagée sans pause n'a jamais été mesurée. Compte tes longueurs à la prochaine séance : sans ce chiffre, aucune progression n'est mesurable.`
      : `Ta distance continue de référence est ${swim.continuous} m sur ${swim.sessions} séance(s) enregistrée(s). Travaille la glisse en brasse avant de chercher la distance, et note tes longueurs à chaque fois.`
  }

  if (/km|couru|footing|run|marathon|allure/.test(m)) {
    return run.longest === null
      ? `Aucune sortie n'est encore enregistrée, donc je n'ai ni volume ni allure à commenter. Enregistre ta prochaine course depuis l'écran Semaine pour qu'elle compte dans ta charge et ton score.`
      : `Tu es à ${run.km7.toFixed(1)} km sur 7 jours, plus longue sortie ${run.longest.toFixed(1)} km. La règle du programme est +8 % de volume par semaine, pas plus. Si tu as couru hors programme, enregistre la séance pour qu'elle compte.`
  }

  if (/traction|dips|muscle|force|test/.test(m)) {
    const untested = (['pullups', 'dips', 'muscleups', 'legraises'] as const).filter(
      (k) => benchmarkValue(state.benchmarks[k]) === null,
    )
    return untested.length > 0
      ? `Non testé : ${untested.join(', ')}. Une seule série par repère, jusqu'à la dernière répétition propre, 4 min de repos entre deux tests. Le protocole est intégré à ta prochaine séance haut du corps.`
      : `Tes repères sont enregistrés. Retente un test quand tu passes trois séances d'affilée en gardant deux répétitions en réserve sur la dernière série.`
  }

  const top = computeAlerts(state, today)[0]
  if (top) {
    return `${top.title} — ${top.evidence}. ${top.body}`
  }

  return `Je n'ai pas de connexion pour te répondre en détail. Dis-moi ton état (fatigue, douleur, temps disponible) ou une séance réalisée, et je te réponds à partir de tes chiffres.`
}

/** Message d'ouverture : le signal le plus critique du jour, ou un accueil neutre. */
export function openingMessage(state: AthleteState, today: ISODate): string {
  const alerts = computeAlerts(state, today)
  const top = alerts[0]
  const name = state.profile.name

  if (top && top.level !== 'info') {
    return `Salut ${name}. ${top.title} — ${top.evidence}. ${top.body}`
  }

  const session = state.sessions.find((s) => s.date === today)
  if (session && session.type !== 'REST') {
    return `Salut ${name}. Au programme aujourd'hui : ${session.title}. Dis-moi comment tu te sens, ce que tu as fait, ou le temps dont tu disposes, et j'ajuste.`
  }

  return `Salut ${name}. Journée de repos aujourd'hui. Dis-moi comment tu te sens, ce que tu as fait, ou le temps dont tu disposes, et j'ajuste la suite.`
}
