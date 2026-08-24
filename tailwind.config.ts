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
        bg: '#0B0C0E',
        bg2: '#101215',
        card: '#141719',
        cardHi: '#191D20',
        line: '#24282D',
        line2: '#2E333A',
        text: '#EFF1F3',
        mut: '#878E98',
        dim: '#5B626B',
        run: '#E2603A',
        swim: '#2F97AE',
        street: '#7C6BE3',
        legs: '#C2547A',
        rest: '#565D67',
        ok: '#5BBF7B',
        warn: '#E0A73C',
        bad: '#D8524A',
        physique: '#8A9BB0',
        force: '#B98A4E',
        endurance: '#C05B6E',
        /* Marque : châssis uniquement, jamais sur une donnée. */
        brand: '#924DDE',
      },
      fontFamily: {
        display: ['var(--font-barlow)', 'Impact', 'sans-serif'],
        sans: ['var(--font-inter)', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
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
