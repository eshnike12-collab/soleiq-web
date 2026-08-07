import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  // `strictPort` is deliberately off: with it on, a stray dev server left over
  // from a closed terminal makes `npm run dev` fail outright instead of just
  // using the next free port. Nothing here depends on a fixed port — cookies
  // are scoped per host, not per port — so falling through to 5174 is strictly
  // better than an error.
  server: { port: 5173 },
})
