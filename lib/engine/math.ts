/** Primitives numériques partagees par le moteur. */

export function clamp(v: number, a = 0, b = 100): number {
  return Math.max(a, Math.min(b, v))
}

export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0)
}

/** Arrondi au demi le plus proche : les distances de course sont affichees au 0,5 km. */
export function half(v: number): number {
  return Math.round(v * 2) / 2
}

/** Allure en mm:ss par km. */
export function pace(minutes: number, km: number): string {
  if (!km) return '—'
  const p = minutes / km
  return `${Math.floor(p)}:${String(Math.round((p % 1) * 60)).padStart(2, '0')}`
}

export function paceToMin(str: string): number {
  const [m, s] = str.split(':').map(Number)
  return (m ?? 0) + (s ?? 0) / 60
}

export function mmss(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}
