import { baseAncreeSur } from '@/lib/engine/ancrage'
import { addDays, todayISO } from '@/lib/engine/date'
import { prolongationRequise } from '@/lib/engine/horizon'
import { baseWeeklyKm, generatePlan } from '@/lib/engine/program'
import type { GoalType, Sport } from '@/lib/engine/types'
import { sessionToRow } from '@/lib/db/mappers'
import { createClient } from '@/lib/supabase/server'

/**
 * PROLONGATION DU PROGRAMME
 *
 * Le plan gardait huit semaines d'avance, générées à l'inscription, et rien
 * ne les renouvelait. Il se prolonge maintenant tout seul dès que l'avance
 * passe sous trois semaines.
 *
 * Le déclenchement se fait à la lecture — quand l'athlète ouvre son écran du
 * jour ou sa semaine — et non par une tâche planifiée. Une tâche peut ne pas
 * s'exécuter sans que personne le sache ; ici la génération a lieu
 * exactement au moment où quelqu'un a besoin des séances, donc elle ne peut
 * pas manquer celui qui regarde.
 *
 * `prolongationRequise` décide du quand et du combien, et s'éprouve sur des
 * dates seules ; cette fonction ne fait que la brancher sur la base.
 */

interface LigneProfil {
  rest_weekday: number
  allow_doubles: boolean
  race_date: string | null
  base_weekly_km: number | string | null
  sports: string[] | null
  available_weekdays: number[] | null
}

const num = (v: number | string | null): number | undefined => {
  if (v === null) return undefined
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : undefined
}

/**
 * Volume hebdomadaire couru sur la fenetre, depuis les lignes brutes.
 *
 * `volumeHebdoReel` travaille sur un `AthleteState` complet, qu'il faudrait
 * charger en entier pour trois champs. La regle est la meme, et la seule qui
 * compte : trois sorties minimum, distance enregistree, moyenne sur quatre
 * semaines.
 */
function volumeHebdoReelDepuisLignes(
  lignes: { log: { km?: number | null } | null }[],
): number | null {
  const km = lignes.map((l) => l.log?.km ?? 0).filter((k) => k > 0)
  if (km.length < 3) return null
  return Math.round((km.reduce((a, b) => a + b, 0) / 4) * 10) / 10
}

/**
 * Prolonge le plan si l'horizon le demande. Renvoie le nombre de séances
 * créées, zéro quand il n'y avait rien à faire.
 *
 * Silencieuse par construction : appelée pendant le rendu d'une page, elle ne
 * doit jamais empêcher cette page de s'afficher. Une erreur de base laisse
 * l'athlète devant les séances qu'il a déjà, ce qui vaut mieux qu'un écran
 * d'erreur.
 */
export async function prolongerSiNecessaire(userId: string): Promise<number> {
  const supabase = createClient()
  const today = todayISO()

  const { data: derniere } = await supabase
    .from('sessions')
    .select('date, week')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle<{ date: string; week: number }>()

  const requis = prolongationRequise(today, derniere?.date ?? null, derniere?.week ?? 0)
  if (!requis) return 0

  const { data: profil } = await supabase
    .from('profiles')
    .select('rest_weekday, allow_doubles, race_date, base_weekly_km, sports, available_weekdays')
    .eq('id', userId)
    .maybeSingle<LigneProfil>()
  if (!profil) return 0

  /*
   * L'objectif principal decide de la repartition de la semaine. Absent — un
   * compte anterieur aux objectifs — le generateur retombe sur sa repartition
   * d'origine, ce qui vaut mieux que de ne rien produire.
   */
  const { data: objectif } = await supabase
    .from('goals')
    .select('type')
    .eq('user_id', userId)
    .eq('status', 'actif')
    .eq('priority', 'principal')
    .maybeSingle<{ type: string }>()

  const { data: reperes } = await supabase
    .from('benchmarks')
    .select('key')
    .eq('user_id', userId)
    .eq('partial', false)

  /*
   * La base du prochain bloc part de ce qui a ete couru, pas de ce qui a ete
   * declare a l'inscription. Sans quoi un athlete annoncant dix-huit
   * kilometres en aout voyait son plan de decembre calcule sur dix-huit,
   * qu'il en coure trente ou huit — alors que le produit affirme partout
   * qu'il part du reel.
   *
   * Trois sorties minimum sur quatre semaines : en dessous, la moyenne
   * decrirait un accident plutot qu'une habitude, et la base du questionnaire
   * reste en vigueur.
   */
  const { data: courues } = await supabase
    .from('sessions')
    .select('date, status, log')
    .eq('user_id', userId)
    .eq('status', 'done')
    .gte('date', addDays(today, -28))
  const reel = volumeHebdoReelDepuisLignes(courues ?? [])

  const baseProfil = num(profil.base_weekly_km) ?? null
  const cible = reel === null ? null : baseWeeklyKm(reel)
  const baseKm = cible === null ? baseProfil : baseAncreeSur(cible, requis.semaine)
  /*
   * Le plafond suit la reference mesuree, et non la base : celle-ci n'est
   * plus un volume une fois ancree au milieu du plan.
   */
  const plafondKm = cible === null ? undefined : Math.min(cible * 3, 90)

  const plan = generatePlan(requis.depuis, requis.semaines, requis.semaine, {
    restWeekday: profil.rest_weekday,
    allowDoubles: profil.allow_doubles,
    raceDate: profil.race_date,
    goal: (objectif?.type as GoalType | undefined) ?? null,
    sports: (profil.sports ?? []) as Sport[],
    availableWeekdays: profil.available_weekdays ?? [],
    reperesConnus: (reperes ?? []).map((r: { key: string }) => r.key),
    ...(baseKm !== null ? { baseKm } : {}),
    ...(plafondKm !== undefined ? { plafondKm } : {}),
  })

  /*
   * Deux onglets ouverts en meme temps declencheraient deux prolongations
   * identiques. On relit donc les dates deja peuplees juste avant d'ecrire, et
   * on n'insere que ce qui manque. Il reste une fenetre de quelques
   * millisecondes entre la lecture et l'ecriture ; a defaut d'une contrainte
   * d'unicite en base, c'est la garantie la plus solide disponible ici, et
   * l'accident se verrait — deux seances le meme jour.
   */
  const fin = plan[plan.length - 1]?.date ?? requis.depuis
  const { data: existantes } = await supabase
    .from('sessions')
    .select('date')
    .eq('user_id', userId)
    .gte('date', requis.depuis)
    .lte('date', fin)

  const prises = new Set((existantes ?? []).map((s: { date: string }) => s.date))
  const aInserer = plan.filter((s) => !prises.has(s.date))
  if (aInserer.length === 0) return 0

  const { error } = await supabase
    .from('sessions')
    .insert(aInserer.map((s) => sessionToRow(s, userId)))
  if (error) return 0

  return aInserer.length
}
