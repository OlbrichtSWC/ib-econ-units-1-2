/** Draws confetti bursts on a canvas over the page. Skipped when the device asks for reduced motion. */
import { useEffect, useRef } from 'preact/hooks';
import { CELEBRATE_EVENT, CelebrateOptions } from './celebrate';
import { reducedMotion } from './motion';

interface Bit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  spin: number;
  angle: number;
  color: string;
  shape: 0 | 1 | 2;
  life: number;
}

const COLORS = ['#1B3A6B', '#C8102E', '#F2B600', '#3E6FB8', '#E8667A', '#1E6B3A'];

export function CelebrationLayer() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const g = canvas.getContext('2d');
    if (!g) return;
    let bits: Bit[] = [];
    let raf = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const frame = () => {
      g.clearRect(0, 0, window.innerWidth, window.innerHeight);
      bits = bits.filter((b) => b.life > 0 && b.y < window.innerHeight + 20);
      for (const b of bits) {
        b.vy += 0.25;
        b.vx *= 0.99;
        b.x += b.vx;
        b.y += b.vy;
        b.angle += b.spin;
        b.life -= 1;
        g.save();
        g.globalAlpha = Math.min(1, b.life / 30);
        g.translate(b.x, b.y);
        g.rotate(b.angle);
        g.fillStyle = b.color;
        if (b.shape === 0) g.fillRect(-b.r, -b.r / 2, b.r * 2, b.r);
        else if (b.shape === 1) {
          g.beginPath();
          g.arc(0, 0, b.r * 0.7, 0, Math.PI * 2);
          g.fill();
        } else {
          g.beginPath();
          g.moveTo(0, -b.r);
          g.lineTo(b.r, b.r);
          g.lineTo(-b.r, b.r);
          g.fill();
        }
        g.restore();
      }
      raf = bits.length ? requestAnimationFrame(frame) : 0;
    };

    const onBurst = (e: Event) => {
      if (reducedMotion()) return;
      const o = ((e as CustomEvent).detail ?? {}) as CelebrateOptions;
      const big = o.size === 'big';
      const x = (o.x ?? 0.5) * window.innerWidth;
      const y = (o.y ?? 0.3) * window.innerHeight;
      const n = big ? 120 : 36;
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * (big ? 1.6 : 1.2);
        const speed = (big ? 8 : 5) + Math.random() * (big ? 8 : 4);
        bits.push({
          x, y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          r: 3 + Math.random() * 4,
          spin: (Math.random() - 0.5) * 0.4,
          angle: Math.random() * 6,
          color: COLORS[i % COLORS.length],
          shape: (i % 3) as 0 | 1 | 2,
          life: 70 + Math.random() * 50,
        });
      }
      if (!raf) raf = requestAnimationFrame(frame);
    };

    window.addEventListener(CELEBRATE_EVENT, onBurst);
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener(CELEBRATE_EVENT, onBurst);
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(raf);
    };
  }, []);
  return <canvas ref={ref} class="celebration-layer" aria-hidden="true" />;
}
