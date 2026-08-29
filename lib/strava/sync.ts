import 'server-only'

import type { ISODate, SessionKind } from '@/lib/engine/types'
import { createAdminClient } from '@/lib/supabase/admin'
import { estRejet, mapActivity, matchSession, type StravaActivity } from './activity'
import { markSynced } from './store'

/**
 * IMPORT DES ACTIVITÉS
 *
 * Une activité vient renseigner la séance prévue du même jour et de la même
 * discipline. À défaut, elle devient une séance hors programme : mieux vaut
 * une ligne « non prévue » qu'un entraînement qui disparaît.
 *
 * L'import ne remplit que le mesuré. La séance passe à « faite » — elle a bien
 * eu lieu — mais sans RPE saisi elle reste marquée comme estimée, et les
 * graphiques de charge la tramen­t comme telle.
 *
 * L'index unique (user_id, strava_activity_id) rend l'opération rejouable :
 * Strava réémet volontiers le même événement.
 */

export interface ResultatImport {
  crees: number
  misAJour: number
  ignores: { stravaId: number; raison: string }[]
  /** Séances importées auxquelles il manque encore une saisie de l'athlète. */
  aCompleter: number
}

interface LigneSeance {
  id: string
  date: ISODate
  kind: SessionKind
  status: string
  strava_activity_id: number | null
}

/** Titre porté par une séance hors programme, pour qu'elle se repère d'un coup d'œil. */
const TYPE_PAR_DISCIPLINE: Record<SessionKind, string> = {
  run: 'RUN',
  swim: 'SWIM',
  bike: 'BIKE',
  strength: 'UPPER',
  rest: 'REST',
}

export async function importActivities(
  userId: string,
  activites: StravaActivity[],
): Promise<ResultatImport> {
  const supabase = createAdminClient()
  const resultat: ResultatImport = { crees: 0, misAJour: 0, ignores: [], aCompleter: 0 }

  const dates = [...new Set(activites.map((a) => a.start_date_local.slice(0, 10)))]
  if (dates.length === 0) return resultat

  const { data } = await supabase
    .from('sessions')
    .select('id, date, kind, status, strava_activity_id')
    .eq('user_id', userId)
    .in('date', dates)

  let seances = (data ?? []) as LigneSeance[]

  for (const brute of activites) {
    const activite = mapActivity(brute)
    if (estRejet(activite)) {
      resultat.ignores.push(activite)
      continue
    }

    if (activite.aCompleter.length > 0) resultat.aCompleter++

    const champs = {
      status: 'done' as const,
      kind: activite.kind,
      duration: Math.round(activite.minutes),
      log: activite.log,
      // Le RPE n'est écrit que s'il vient de l'athlète. Sinon la colonne
      // reste vide et la séance se lit comme « ressenti non saisi ».
      rpe: activite.rpe,
      source: 'strava' as const,
      strava_activity_id: activite.stravaId,
    }

    const dejaImportee = seances.find((s) => s.strava_activity_id === activite.stravaId)
    if (dejaImportee) {
      await supabase.from('sessions').update(champs).eq('id', dejaImportee.id)
      resultat.misAJour++
      continue
    }

    const prevue = matchSession(activite, seances)
    if (prevue) {
      await supabase.from('sessions').update(champs).eq('id', prevue.id)
      // La séance est prise : une deuxième activité du jour ne l'écrasera pas.
      seances = seances.map((s) =>
        s.id === prevue.id ? { ...s, status: 'done', strava_activity_id: activite.stravaId } : s,
      )
      resultat.misAJour++
      continue
    }

    const { data: cree } = await supabase
      .from('sessions')
      .insert({
        user_id: userId,
        date: activite.date,
        type: TYPE_PAR_DISCIPLINE[activite.kind],
        week: 0,
        title: activite.title,
        intensity: 0,
        unplanned: true,
        ...champs,
      })
      .select('id, date, kind, status, strava_activity_id')
      .maybeSingle<LigneSeance>()

    if (cree) {
      seances = [...seances, cree]
      resultat.crees++
    }
  }

  await markSynced(userId)
  return resultat
}
