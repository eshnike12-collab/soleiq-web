import { useState } from 'react'
import { ThemeProvider } from './context/ThemeContext'
import { CartProvider } from './context/CartContext'
import FloatingParticles from './components/FloatingParticles'
import Navbar from './components/Navbar'
import CartDrawer from './components/CartDrawer'
import Hero from './components/Hero'
import HowItWorks from './components/HowItWorks'
import Features from './components/Features'
import Shop from './components/Shop'
import Science from './components/Science'
import Reviews from './components/Reviews'
import FAQ from './components/FAQ'
import About from './components/About'
import Blog from './components/Blog'
import Contact from './components/Contact'
import Footer from './components/Footer'

function AppInner() {
  const [cartOpen, setCartOpen] = useState(false)

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <FloatingParticles />
      <Navbar onCartOpen={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />

      <main style={{ position: 'relative', zIndex: 1 }}>
        <Hero />
        <HowItWorks />
        <Features />
        <Shop />
        <Science />
        <Reviews />
        <FAQ />
        <About />
        <Blog />
        <Contact />
      </main>

      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <CartProvider>
        <AppInner />
      </CartProvider>
    </ThemeProvider>
  )
}
