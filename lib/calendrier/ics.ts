import { addDays } from '@/lib/engine/date'
import type { AthleteState, ISODate, Session } from '@/lib/engine/types'

/**
 * PROGRAMME AU FORMAT CALENDRIER
 *
 * L'application ne sait pas parler aux montres : Garmin, COROS et Suunto
 * ouvrent leur interface au compte-gouttes, et Strava ne la donne plus du
 * tout. Le calendrier contourne le problème par le bas — toutes ces montres
 * savent afficher l'agenda du téléphone, et le téléphone sait s'abonner à une
 * adresse. Le programme arrive donc au poignet sans dépendre de personne.
 *
 * Tout est en journée entière : l'application ne demande jamais à quelle
 * heure on s'entraîne, et placer une séance à 18 h serait l'inventer.
 */

/** RFC 5545 : les lignes sont pliées à 75 octets, la suite préfixée d'une espace. */
function plier(ligne: string): string {
  const octets = Buffer.from(ligne, 'utf8')
  if (octets.length <= 75) return ligne

  const morceaux: string[] = []
  let debut = 0
  let limite = 75
  while (debut < octets.length) {
    let fin = Math.min(debut + limite, octets.length)
    /*
     * On ne coupe pas au milieu d'un caractere : en UTF-8, un octet de
     * continuation commence par 10xxxxxx. Reculer jusqu'au debut du
     * caractere evite de produire un fichier que les lecteurs stricts
     * refusent — et un accent casse au milieu d'un titre.
     */
    while (fin > debut && fin < octets.length && (octets[fin]! & 0xc0) === 0x80) fin--
    morceaux.push(octets.subarray(debut, fin).toString('utf8'))
    debut = fin
    limite = 74 // les lignes suivantes portent une espace de continuation
  }
  return morceaux.join('\r\n ')
}

/** Échappement RFC 5545. L'ordre compte : la barre oblique d'abord. */
function echapper(texte: string): string {
  return texte
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

const compact = (date: ISODate): string => date.replace(/-/g, '')

/** Ce que la séance dit d'elle-même, sans rien inventer de ce qui n'est pas prescrit. */
function description(s: Session): string {
  const lignes: string[] = []
  if (s.goal) lignes.push(s.goal)
  if (s.target) lignes.push(`Cible : ${s.target}`)
  if (s.why) lignes.push(s.why)
  if (s.exercises.length > 0) {
    lignes.push('')
    for (const e of s.exercises) {
      lignes.push(`• ${e.n} — ${e.sets} × ${e.reps}${e.unit ? ` ${e.unit}` : ''}`)
    }
  }
  if (s.finisher) lignes.push('', `Enchaîné : ${s.finisher.title} (${s.finisher.duration} min)`)
  if (s.extra) lignes.push('', `Seconde séance : ${s.extra.title}`)
  return lignes.join('\n')
}

/** Le titre porte l'état : une séance faite ne se lit pas comme une séance à faire. */
function titre(s: Session): string {
  const marque = s.status === 'done' ? '✓ ' : s.status === 'skipped' ? '✗ ' : ''
  const duree = s.duration > 0 ? ` · ${s.duration} min` : ''
  return `${marque}${s.title}${duree}`
}

export interface OptionsCalendrier {
  /** Jours de passé conservés. Le calendrier montre aussi ce qui a été fait. */
  passeJours?: number
  /** Garde-fou : un calendrier n'a pas à peser des mégaoctets. */
  maximum?: number
}

/**
 * `domaine` sert à composer des identifiants d'événement stables. Un UID qui
 * changerait d'une lecture à l'autre ferait réapparaître chaque séance comme
 * un nouvel événement à chaque rafraîchissement.
 */
export function calendrierIcs(
  state: AthleteState,
  today: ISODate,
  domaine = 'hybrid',
  { passeJours = 60, maximum = 400 }: OptionsCalendrier = {},
): string {
  const depuis = addDays(today, -passeJours)
  const seances = state.sessions
    .filter((s) => s.date >= depuis)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, maximum)

  /*
   * `DTSTAMP` doit exister et ne devrait pas bouger sans raison : une valeur
   * neuve a chaque lecture presente chaque evenement comme modifie, ce que
   * certains clients traduisent par une notification. On la cale donc sur le
   * jour, pas sur l'instant.
   */
  const horodatage = `${compact(today)}T000000Z`

  const lignes: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//Hybrid//Programme//FR`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Hybrid — ton programme',
    // Quatre heures : assez pour qu'une séance déplacée le matin soit à jour
    // l'après-midi, assez peu pour ne pas réveiller le téléphone sans cesse.
    'REFRESH-INTERVAL;VALUE=DURATION:PT4H',
    'X-PUBLISHED-TTL:PT4H',
  ]

  for (const s of seances) {
    const corps = description(s)
    lignes.push(
      'BEGIN:VEVENT',
      `UID:${s.id}@${domaine}`,
      `DTSTAMP:${horodatage}`,
      // Journée entière : DTEND est exclusif, donc le lendemain.
      `DTSTART;VALUE=DATE:${compact(s.date)}`,
      `DTEND;VALUE=DATE:${compact(addDays(s.date, 1))}`,
      `SUMMARY:${echapper(titre(s))}`,
      ...(corps ? [`DESCRIPTION:${echapper(corps)}`] : []),
      'TRANSP:TRANSPARENT',
      `STATUS:${s.status === 'skipped' ? 'CANCELLED' : 'CONFIRMED'}`,
      'END:VEVENT',
    )
  }

  lignes.push('END:VCALENDAR')
  return lignes.map(plier).join('\r\n') + '\r\n'
}
