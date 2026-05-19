/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        dm: ['DM Sans', 'sans-serif'],
      },
      colors: {
        'clr-bg': 'var(--clr-bg)',
        'clr-surface': 'var(--clr-surface)',
        'clr-accent': 'var(--clr-accent)',
        'clr-accent-2': 'var(--clr-accent-2)',
        'clr-text': 'var(--clr-text)',
        'clr-muted': 'var(--clr-text-muted)',
      },
    },
  },
  plugins: [],
}
