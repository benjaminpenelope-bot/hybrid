/**
 * Écran affiché tant que le projet Supabase n'est pas branché.
 * Il dit ce qui manque et ce qu'il reste à faire — pas de page blanche,
 * pas de fausse démo qui laisserait croire que les données sont réelles.
 */
export function ConfigurationRequise() {
  const etapes = [
    ['Créer un projet Supabase', 'supabase.com, région Europe.'],
    [
      'Renseigner .env.local',
      'NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY et SUPABASE_SERVICE_ROLE_KEY, en copiant .env.example.',
    ],
    ['Pousser les migrations', 'supabase link --project-ref <ref> puis supabase db push.'],
    [
      'Activer les fournisseurs',
      "Email pour le lien magique, et Apple ou Google si tu veux les boutons correspondants.",
    ],
  ]

  return (
    <main className="wrap flex min-h-screen flex-col justify-center py-10">
      <h1 className="dsp text-[26px]">Athlete OS</h1>
      <p className="mt-2 text-[13.5px] leading-relaxed text-mut">
        Le moteur et les écrans sont en place, mais aucun projet Supabase n&apos;est branché.
        L&apos;app ne fabriquera pas de fausses données pour compenser.
      </p>

      <ol className="mt-6 flex flex-col gap-3">
        {etapes.map(([titre, detail], i) => (
          <li key={titre} className="card flex gap-3">
            <span className="num text-[15px] text-dim">{i + 1}</span>
            <div>
              <div className="text-[13.5px]">{titre}</div>
              <p className="mt-1 text-[12px] leading-relaxed text-dim">{detail}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-6 text-[11.5px] leading-relaxed text-dim">
        Détail complet des variables et des migrations dans le README.
      </p>
    </main>
  )
}
