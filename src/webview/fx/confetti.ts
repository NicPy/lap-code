const SYMBOLS = [
  '{}', '()', '=>', '//', '[]', '<>', ';;', '++', '&&', '||',
  '==', '!=', '...', '?:', '/* */', '★', '✓', '0x', 'fn',
];
const HERO_SYMBOLS = ['✓', '★', '{}', '<>'];

const TOTAL_DURATION_MS = 5500;
// Salute = staggered radial bursts at random points in the upper canvas.
const BURST_TIMINGS_MS = [0, 480, 1000, 1700, 2500, 3300];
const PARTICLES_PER_BURST = { min: 26, max: 36 };
const PARTICLE_LIFE_MS = 2400;
const FADE_START_MS = 1100;

interface Particle {
  bornAt: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  drag: number;
  char: string;
  color: string;
  size: number;
  rotation: number;
  vr: number;
  glow: number;
}

function sampleVscodeColors(): string[] {
  const style = getComputedStyle(document.body);
  const get = (v: string, fallback: string) => style.getPropertyValue(v).trim() || fallback;
  return [
    get('--vscode-testing-iconPassed', '#73c991'),
    get('--vscode-charts-yellow', '#ffd54a'),
    get('--vscode-charts-blue', '#3794ff'),
    get('--vscode-charts-purple', '#b180d7'),
    get('--vscode-charts-orange', '#ff9248'),
    get('--vscode-charts-green', '#89d185'),
  ];
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function buildBurst(
  bornAt: number,
  centerX: number,
  centerY: number,
  colors: string[],
): Particle[] {
  const count = randInt(PARTICLES_PER_BURST.min, PARTICLES_PER_BURST.max);
  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    // Slow speeds — particles drift outward like a firework.
    const speed = 1.8 + Math.random() * 2.6;
    const isHero = Math.random() < 0.16;
    return {
      bornAt,
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.6,
      gravity: 0.045,
      drag: 0.985,
      char: isHero ? pick(HERO_SYMBOLS) : pick(SYMBOLS),
      color: pick(colors),
      size: isHero ? 20 + Math.random() * 6 : 13 + Math.random() * 4,
      rotation: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.12,
      glow: isHero ? 16 : 8,
    };
  });
}

export function triggerConfetti(): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d')!;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = sampleVscodeColors();

  // Place each burst at a random spot in the upper portion of the canvas so the
  // particles have room to fall like a salute.
  const particles: Particle[] = BURST_TIMINGS_MS.flatMap(t => {
    const cx = canvas.width * (0.2 + Math.random() * 0.6);
    const cy = canvas.height * (0.2 + Math.random() * 0.25);
    return buildBurst(t, cx, cy, colors);
  });

  const startTime = performance.now();

  function frame(now: number): void {
    const elapsed = now - startTime;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let hasVisible = false;
    for (const p of particles) {
      if (elapsed < p.bornAt) { hasVisible = true; continue; }
      const age = elapsed - p.bornAt;
      if (age > PARTICLE_LIFE_MS) { continue; }

      // Physics: drag slows particles each frame; gravity arcs them down gently.
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.vr;

      const alpha = age < FADE_START_MS
        ? 1
        : 1 - (age - FADE_START_MS) / (PARTICLE_LIFE_MS - FADE_START_MS);

      if (alpha <= 0 || p.y > canvas.height + 40) { continue; }
      hasVisible = true;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = p.glow;
      ctx.fillStyle = p.color;
      ctx.font = `bold ${p.size}px var(--vscode-editor-font-family, monospace)`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.char, 0, 0);
      ctx.restore();
    }

    if (hasVisible && elapsed < TOTAL_DURATION_MS) {
      requestAnimationFrame(frame);
    } else {
      canvas.remove();
    }
  }

  requestAnimationFrame(frame);
}
