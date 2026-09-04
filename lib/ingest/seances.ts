import type { SupabaseClient } from '@supabase/supabase-js'
import type { SessionKind } from '@/lib/engine/types'

/**
 * ÉCRITURE D'UNE SÉANCE IMPORTÉE
 *
 * Le même travail pour toutes les sources : un export Apple Health déposé à
 * la main, un raccourci iOS déclenché chaque soir, une application d'export
 * automatique, un script relié à une montre. Ce fichier existe parce que ce
 * travail était écrit une fois par source, et qu'une règle corrigée dans l'un
 * ne l'était pas dans l'autre.
 *
 * Trois règles, et elles valent d'où que vienne la donnée :
 *
 * Une séance importée est d'abord rapprochée de ce qui était prévu ce jour-là
 * dans la même discipline. Sans ce rapprochement, un athlète qui court sa
 * sortie du mardi se retrouve avec deux lignes : celle qu'il devait faire,
 * restée « prévue », et celle qu'il a faite. Le programme se croirait alors
 * manqué alors qu'il a été suivi.
 *
 * Chaque séance porte la marque de son origine, rangée dans la note. C'est ce
 * qui permet à un second envoi de la reconnaître au lieu de la dupliquer :
 * aucune source ne garantit qu'on ne lui redemandera pas les mêmes jours.
 *
 * Le ressenti reste vide. Aucun appareil ne mesure un RPE, et le déduire
 * d'une fréquence cardiaque serait exactement l'invention que le produit
 * s'interdit.
 */

/** Disciplines qu'une source peut rapporter. Le repos ne s'importe pas. */
export type DisciplineImportee = Exclude<SessionKind, 'rest'>

export interface SeanceImportee {
  /** Clé stable côté source, pour reconnaître un doublon. */
  cle: string
  date: string
  kind: DisciplineImportee
  minutes: number
  /** Mètres. `null` quand la source n'en rapporte pas. */
  distance: number | null
  /** Battements par minute, moyenne. */
  hr?: number | null
  /** Dénivelé positif, en mètres. */
  elev?: number | null
}

const TYPE_PAR_DISCIPLINE: Record<DisciplineImportee, string> = {
  run: 'RUN',
  swim: 'SWIM',
  strength: 'UPPER',
  bike: 'BIKE',
}

interface LigneExistante {
  id: string
  date: string
  kind: string
  status: string
  note: string | null
}

/**
 * Écrit les séances et renvoie le nombre de lignes réellement touchées — les
 * doublons ne comptent pas, puisqu'ils ne changent rien.
 */
export async function ecrireSeances(
  supabase: SupabaseClient,
  userId: string,
  seances: SeanceImportee[],
  origine: 'health' | 'manual',
  titreParDefaut: string,
): Promise<number> {
  if (seances.length === 0) return 0

  const dates = [...new Set(seances.map((s) => s.date))]
  const { data } = await supabase
    .from('sessions')
    .select('id, date, kind, status, note')
    .eq('user_id', userId)
    .in('date', dates)

  const existantes = (data ?? []) as LigneExistante[]
  let ecrites = 0

  for (const s of seances) {
    const marque = `${origine}:${s.cle}`
    if (existantes.some((e) => e.note?.includes(marque))) continue

    const log =
      s.kind === 'run' || s.kind === 'bike'
        ? {
            km: s.distance === null ? null : Math.round((s.distance / 1000) * 100) / 100,
            minutes: s.minutes,
            hr: s.hr ?? null,
            elev: s.elev ?? null,
          }
        : s.kind === 'swim'
          ? // Aucune source ne dit ce qui a été nagé en continu, ni comment.
            {
              minutes: s.minutes,
              distance: s.distance,
              continuous: null,
              pauses: null,
              stroke: null,
              crawl: null,
            }
          : { minutes: s.minutes }

    const champs = {
      status: 'done' as const,
      kind: s.kind,
      duration: Math.round(s.minutes),
      log,
      rpe: null,
      source: origine,
      note: marque,
    }

    const prevue = existantes.find(
      (e) => e.date === s.date && e.kind === s.kind && e.status !== 'done',
    )

    if (prevue) {
      await supabase.from('sessions').update(champs).eq('id', prevue.id)
      prevue.status = 'done'
      prevue.note = marque
    } else {
      await supabase.from('sessions').insert({
        user_id: userId,
        date: s.date,
        type: TYPE_PAR_DISCIPLINE[s.kind],
        week: 0,
        title: titreParDefaut,
        intensity: 0,
        unplanned: true,
        ...champs,
      })
      // La séance vient d'être prise : une deuxième du même jour et de la
      // même discipline ne doit pas se rapprocher de la même ligne.
      existantes.push({ id: 'nouvelle', date: s.date, kind: s.kind, status: 'done', note: marque })
    }
    ecrites++
  }

  return ecrites
}
