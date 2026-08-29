export const metadata = { title: 'Hors ligne · Polytrain' }

export default function Page() {
  return (
    <main className="wrap wrap-etroit flex min-h-screen flex-col justify-center py-10">
      <h1 className="dsp text-[26px]">Hors ligne</h1>
      <p className="mt-3 text-[13.5px] leading-relaxed text-mut">
        Cet écran n&apos;a pas encore été consulté, donc il n&apos;est pas disponible sans réseau.
        Les écrans déjà ouverts restent lisibles.
      </p>
      <p className="mt-3 text-[12.5px] leading-relaxed text-dim">
        Une séance validée sans réseau n&apos;est pas perdue : elle part dans une file locale et
        se synchronise au retour de la connexion.
      </p>
    </main>
  )
}
