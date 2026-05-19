/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        sans: ['DM Sans', 'sans-serif'],
      },
      colors: {
        'clr-bg': 'var(--clr-bg)',
        'clr-surface': 'var(--clr-surface)',
        'clr-surface-2': 'var(--clr-surface-2)',
        'clr-accent': 'var(--clr-accent)',
        'clr-accent-2': 'var(--clr-accent-2)',
        'clr-accent-light': 'var(--clr-accent-light)',
        'clr-text': 'var(--clr-text)',
        'clr-text-muted': 'var(--clr-text-muted)',
        'clr-danger': 'var(--clr-danger)',
        'clr-warning': 'var(--clr-warning)',
        'clr-success': 'var(--clr-success)',
      },
    },
  },
  plugins: [],
}
