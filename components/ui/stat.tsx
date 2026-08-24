/** Petite carte de chiffre. `value` vaut « à mesurer » quand la donnée manque. */
export function Stat({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string
  sub?: string
  color?: string
}) {
  const missing = value === 'à mesurer' || value === 'À TESTER'
  return (
    <div className="rounded-card border border-line bg-card p-3">
      <div className="eyebrow text-[9.5px]">{label}</div>
      <div
        className={`num mt-1 leading-none ${missing ? 'text-[13px]' : 'text-[24px]'}`}
        style={{ color: missing ? 'var(--warn)' : (color ?? 'var(--text)') }}
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-[10.5px] text-dim">{sub}</div>}
    </div>
  )
}

/** Barre de progression sobre, avec sa part non mesurée laissée vide. */
export function Meter({ value, color }: { value: number | null; color?: string }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-line">
      {value !== null && (
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color ?? 'var(--text)' }}
        />
      )}
    </div>
  )
}
