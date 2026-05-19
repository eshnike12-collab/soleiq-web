import { useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';

interface Particle {
  x: number;
  y: number;
  radius: number;
  speed: number;
  sineOffset: number;
  sineFreq: number;
  opacity: number;
  hue: number;
}

const HUES = [174, 195, 220];

function createParticle(W: number, H: number): Particle {
  return {
    x: Math.random() * W,
    y: Math.random() * H,
    radius: 1 + Math.random() * 2,
    speed: 0.15 + Math.random() * 0.35,
    sineOffset: Math.random() * Math.PI * 2,
    sineFreq: 0.008 + Math.random() * 0.007,
    opacity: 0.08 + Math.random() * 0.17,
    hue: HUES[Math.floor(Math.random() * HUES.length)],
  };
}

export default function FloatingParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const frameRef = useRef<number>(0);
  const { isDark } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    // Init 50 particles spread across canvas
    particlesRef.current = Array.from({ length: 50 }, () =>
      createParticle(canvas.width, canvas.height)
    );

    const animate = () => {
      const W = canvas.width;
      const H = canvas.height;
      frameRef.current += 1;

      ctx.clearRect(0, 0, W, H);

      particlesRef.current.forEach((p) => {
        // Upward drift + sine-wave horizontal movement
        p.y -= p.speed;
        p.x += Math.sin(frameRef.current * p.sineFreq + p.sineOffset) * 0.4;

        // Reset when particle goes above canvas top
        if (p.y < -10) {
          const newP = createParticle(W, H);
          newP.y = H + 10;
          newP.x = Math.random() * W;
          Object.assign(p, newP);
        }

        const alpha = isDark ? p.opacity : p.opacity * 0.5;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${p.hue}, 70%, 65%)`;
        ctx.fill();
        ctx.restore();
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [isDark]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
