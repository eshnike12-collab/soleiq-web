/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Inter Tight"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // All values come from CSS variables in src/index.css so the palette
        // lives in exactly one place.
        'clr-bg': 'var(--clr-bg)',
        'clr-surface': 'var(--clr-surface)',
        'clr-surface-2': 'var(--clr-surface-2)',
        'clr-accent': 'var(--clr-accent)', // deep navy — primary
        'clr-accent-soft': 'var(--clr-accent-soft)',
        'clr-accent-2': 'var(--clr-accent-2)', // teal — health / positive signal
        'clr-accent-2-soft': 'var(--clr-accent-2-soft)',
        'clr-text': 'var(--clr-text)',
        'clr-muted': 'var(--clr-text-muted)',
        'clr-border': 'var(--clr-border)',
        'clr-border-strong': 'var(--clr-border-strong)',
      },
      maxWidth: {
        prose: '38rem',
      },
      letterSpacing: {
        tightest: '-0.035em',
      },
    },
  },
  plugins: [],
}
