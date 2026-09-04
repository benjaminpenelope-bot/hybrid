import type { ISODate } from './types'

/**
 * Arithmetique de dates en chaines YYYY-MM-DD.
 * Tout passe par UTC en interne : une séance du 12 mars reste le 12 mars,
 * quel que soit le fuseau du navigateur.
 */

const DAY_MS = 86_400_000

export const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'] as const
export const DAYS_FR_LONG = [
  'Dimanche',
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
] as const
export const MONTHS_FR = [
  'janv',
  'févr',
  'mars',
  'avr',
  'mai',
  'juin',
  'juil',
  'août',
  'sept',
  'oct',
  'nov',
  'déc',
] as const

function parse(date: ISODate): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1))
}

export function iso(date: Date): ISODate {
  return date.toISOString().slice(0, 10)
}

/** Date du jour dans le fuseau local, pas en UTC. */
export function todayISO(now: Date = new Date()): ISODate {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(date: ISODate, n: number): ISODate {
  const dt = parse(date)
  dt.setUTCDate(dt.getUTCDate() + n)
  return iso(dt)
}

/** Nombre de jours de `from` à `to`. Positif si `to` est après `from`. */
export function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((parse(to).getTime() - parse(from).getTime()) / DAY_MS)
}

/** 0 = dimanche, 1 = lundi, ... 6 = samedi. */
export function weekday(date: ISODate): number {
  return parse(date).getUTCDay()
}

/** Lundi de la semaine contenant `date`. */
export function mondayOf(date: ISODate): ISODate {
  const diff = (weekday(date) + 6) % 7
  return addDays(date, -diff)
}

/** Nombre de semaines entamées entre deux dates, minimum 1. */
export function weeksBetween(from: ISODate, to: ISODate): number {
  return Math.max(1, Math.ceil(daysBetween(from, to) / 7))
}

export function formatDate(date: ISODate): string {
  const dt = parse(date)
  return `${DAYS_FR[dt.getUTCDay()]} ${dt.getUTCDate()} ${MONTHS_FR[dt.getUTCMonth()]}`
}

/**
 * Une date dans une phrase : « depuis le 14 août ».
 *
 * `formatDate` y glisse le jour de la semaine — « depuis le Ven 14 août » —
 * qui se lit mal après un article et n'apprend rien sur une date passée.
 */
export function formatJour(date: ISODate): string {
  const dt = parse(date)
  return `${dt.getUTCDate()} ${MONTHS_FR[dt.getUTCMonth()]}`
}

/**
 * Une période, dite comme on la dit à l'oral : « du 12 au 18 mars », et
 * « du 28 février au 6 mars » quand elle change de mois.
 *
 * `formatDate` aux deux bouts donnait « Du Jeu 12 mars au Mer 18 mars » : les
 * jours de semaine n'apprennent rien sur une période et le mois s'y répète.
 */
export function formatPeriode(du: ISODate, au: ISODate): string {
  const a = parse(du)
  const b = parse(au)
  const memeMois = a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear()
  const debut = memeMois
    ? `${a.getUTCDate()}`
    : `${a.getUTCDate()} ${MONTHS_FR[a.getUTCMonth()]}`
  return `du ${debut} au ${b.getUTCDate()} ${MONTHS_FR[b.getUTCMonth()]}`
}

export function dayLabel(date: ISODate): string {
  return DAYS_FR[weekday(date)] ?? ''
}
