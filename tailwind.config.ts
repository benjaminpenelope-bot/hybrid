import type { Config } from 'tailwindcss'

/**
 * Tokens repris tels quels du prototype de reference (reference/athlete-os.jsx).
 * La couleur ne sert qu'a identifier une discipline ou un niveau d'alerte.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /*
         * Une seule source de verite : les canaux definis dans globals.css.
         * `<alpha-value>` laisse Tailwind appliquer une opacite (`bg-text/10`),
         * ce qu'une valeur hexadecimale interdit.
         */
        bg: 'rgb(var(--bg-c) / <alpha-value>)',
        bg2: 'rgb(var(--bg2-c) / <alpha-value>)',
        card: 'rgb(var(--card-c) / <alpha-value>)',
        line: 'rgb(var(--line-c) / <alpha-value>)',
        line2: 'rgb(var(--line2-c) / <alpha-value>)',
        text: 'rgb(var(--text-c) / <alpha-value>)',
        mut: 'rgb(var(--mut-c) / <alpha-value>)',
        dim: 'rgb(var(--dim-c) / <alpha-value>)',
        run: 'rgb(var(--run-c) / <alpha-value>)',
        swim: 'rgb(var(--swim-c) / <alpha-value>)',
        bike: 'rgb(var(--bike-c) / <alpha-value>)',
        street: 'rgb(var(--street-c) / <alpha-value>)',
        legs: 'rgb(var(--legs-c) / <alpha-value>)',
        rest: 'rgb(var(--rest-c) / <alpha-value>)',
        ok: 'rgb(var(--ok-c) / <alpha-value>)',
        warn: 'rgb(var(--warn-c) / <alpha-value>)',
        bad: 'rgb(var(--bad-c) / <alpha-value>)',
        physique: 'rgb(var(--physique-c) / <alpha-value>)',
        force: 'rgb(var(--force-c) / <alpha-value>)',
        endurance: 'rgb(var(--endurance-c) / <alpha-value>)',
        brand: 'rgb(var(--brand-c) / <alpha-value>)',
        cardHi: 'rgb(var(--card-hi-c) / <alpha-value>)',
      },
      fontFamily: {
        /*
         * `-apple-system` en tete : sur iPhone et sur Mac, c'est le vrai
         * SF Pro qui s'affiche — aucune police web ne l'egale, et elle est
         * deja sur l'appareil, donc gratuite a charger. Inter prend le relais
         * ailleurs, c'est le dessin le plus proche.
         */
        display: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'var(--font-inter)', 'sans-serif'],
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'var(--font-inter)', 'sans-serif'],
      },
      borderRadius: {
        /* Rayon iOS : plus genereux que la carte d'origine a 16 px. */
        card: '22px',
      },
      maxWidth: {
        app: '520px',
        desk: '1120px',
      },
    },
  },
  plugins: [],
}

export default config
