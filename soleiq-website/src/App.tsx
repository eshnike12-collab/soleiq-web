import { lazy, Suspense, useMemo } from 'react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import FeatureSections from './components/FeatureSections'
import Journeys from './components/Journeys'
import Research from './components/Research'
import Progression from './components/Progression'
import About from './components/About'
import Blog from './components/Blog'
import Contact from './components/Contact'
import Footer from './components/Footer'
import Cursor from './components/Cursor'
import { detectCapabilities } from './three/capabilities'

// three, R3F, drei, gsap and lenis are all below the fold. Keeping them out of
// the entry chunk is the difference between a hero that paints immediately and
// one that waits on a megabyte of renderer.
const ParticleNarrative = lazy(() => import('./components/ParticleNarrative'))
const SmoothScroll = lazy(() => import('./components/SmoothScroll'))

export default function App() {
  const caps = useMemo(detectCapabilities, [])
  const smooth = !caps.reducedMotion && !caps.coarsePointer

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      {smooth && (
        <Suspense fallback={null}>
          <SmoothScroll enabled />
        </Suspense>
      )}

      <Cursor enabled={!caps.coarsePointer} />
      <Navbar />

      <main id="main">
        <Hero />
        <Suspense fallback={<div className="min-h-[60svh]" aria-hidden="true" />}>
          <ParticleNarrative />
        </Suspense>
        <FeatureSections />
        <Journeys />
        <Research />
        <Progression />
        <About />
        <Blog />
        <Contact />
      </main>

      <Footer />
    </>
  )
}
