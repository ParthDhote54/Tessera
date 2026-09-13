import { useEffect, useRef } from 'react';

type Node = {
  id: string;
  label: string;
  kind: string;
  x: number;
  y: number;
  w: number;
  h: number;
  hue: string;
};

const NODES: Node[] = [
  { id: 'a', label: 'Hero Product', kind: 'Product', x: 0.06, y: 0.14, w: 0.38, h: 0.46, hue: '#E8A87C' },
  { id: 'b', label: 'AR Anchor', kind: 'Hotspot', x: 0.48, y: 0.12, w: 0.22, h: 0.24, hue: '#9BB8C9' },
  { id: 'c', label: 'Shop Now', kind: 'CTA', x: 0.74, y: 0.20, w: 0.20, h: 0.24, hue: '#8FBFB0' },
  { id: 'd', label: '20% Off Today', kind: 'Offer', x: 0.06, y: 0.66, w: 0.32, h: 0.22, hue: '#D4A017' },
  { id: 'e', label: 'Quick Poll', kind: 'Poll', x: 0.44, y: 0.56, w: 0.50, h: 0.32, hue: '#C9A0C4' },
];

const LINKS: Array<[string, string]> = [
  ['a', 'b'],
  ['a', 'c'],
  ['a', 'd'],
  ['c', 'e'],
  ['d', 'e'],
];

export function LivingStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let animId = 0;
    let running = true;

    const resize = () => {
      const parent = canvas.parentElement;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = parent?.clientWidth || window.innerWidth;
      const h = parent?.clientHeight || window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = (t: number) => {
      const parent = canvas.parentElement;
      const W = parent?.clientWidth || window.innerWidth;
      const H = parent?.clientHeight || window.innerHeight;

      ctx.clearRect(0, 0, W, H);

      const g = ctx.createRadialGradient(W * 0.55, H * 0.42, 40, W * 0.5, H * 0.5, Math.max(W, H) * 0.72);
      g.addColorStop(0, '#2A1C14');
      g.addColorStop(0.38, '#14110E');
      g.addColorStop(1, '#070605');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      const wash = ctx.createLinearGradient(0, 0, W, H * 0.7);
      wash.addColorStop(0, 'rgba(232, 168, 124, 0.16)');
      wash.addColorStop(0.45, 'rgba(80, 50, 30, 0.04)');
      wash.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, W, H);

      const spacing = 28;
      ctx.fillStyle = 'rgba(246, 241, 232, 0.045)';
      for (let x = spacing; x < W; x += spacing) {
        for (let y = spacing; y < H; y += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, 0.9, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const drift = reduce ? 0 : t * 0.00028;
      const placed = NODES.map((n, i) => {
        const ox = reduce ? 0 : Math.sin(drift + i * 1.3) * 10;
        const oy = reduce ? 0 : Math.cos(drift * 0.9 + i) * 8;
        return {
          ...n,
          px: n.x * W + ox,
          py: n.y * H + oy,
          pw: n.w * W,
          ph: n.h * H,
        };
      });
      const byId = Object.fromEntries(placed.map((n) => [n.id, n]));

      ctx.lineWidth = 1.25;
      LINKS.forEach(([a, b], i) => {
        const na = byId[a];
        const nb = byId[b];
        if (!na || !nb) return;
        const x1 = na.px + na.pw * 0.85;
        const y1 = na.py + na.ph * 0.45;
        const x2 = nb.px + nb.pw * 0.15;
        const y2 = nb.py + nb.ph * 0.4;
        const pulse = reduce ? 0.28 : 0.18 + (Math.sin(t * 0.0018 + i) + 1) * 0.12;
        ctx.strokeStyle = `rgba(232, 168, 124, ${pulse})`;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.bezierCurveTo((x1 + x2) / 2, y1, (x1 + x2) / 2, y2, x2, y2);
        ctx.stroke();
      });

      placed.forEach((n) => drawTile(ctx, n));

      if (!reduce) {
        const c1x = (0.44 + Math.sin(t * 0.00045) * 0.08) * W;
        const c1y = (0.34 + Math.cos(t * 0.00038) * 0.06) * H;
        const c2x = (0.68 + Math.cos(t * 0.00032) * 0.08) * W;
        const c2y = (0.72 + Math.sin(t * 0.0004) * 0.06) * H;
        drawCursor(ctx, c1x, c1y, 'Mira Chen', '#E8A87C');
        drawCursor(ctx, c2x, c2y, 'Jules Park', '#8FBFB0');
      }

      const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.72);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(7,6,5,0.62)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

      if (!reduce && running) animId = requestAnimationFrame(draw);
    };

    if (reduce) draw(0);
    else animId = requestAnimationFrame(draw);

    return () => {
      running = false;
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return <canvas ref={canvasRef} className="living-stage" aria-hidden="true" />;
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  n: { px: number; py: number; pw: number; ph: number; label: string; kind: string; hue: string }
) {
  const { px, py, pw, ph, hue } = n;
  const r = 18;
  ctx.save();

  // Colored glow shadow
  ctx.shadowColor = `${hue}70`;
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = 'rgba(18, 14, 10, 0.94)';
  roundRect(ctx, px, py, pw, ph, r);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Vivid color-tinted border
  ctx.strokeStyle = `${hue}80`;
  ctx.lineWidth = 1.4;
  roundRect(ctx, px, py, pw, ph, r);
  ctx.stroke();

  // Color wash gradient (top stronger)
  const inner = ctx.createLinearGradient(px, py, px, py + ph);
  inner.addColorStop(0, `${hue}38`);
  inner.addColorStop(0.55, `${hue}14`);
  inner.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = inner;
  roundRect(ctx, px, py, pw, ph, r);
  ctx.fill();

  // Icon badge
  ctx.fillStyle = `${hue}28`;
  roundRect(ctx, px + 14, py + 14, 28, 28, 8);
  ctx.fill();

  ctx.strokeStyle = hue;
  ctx.lineWidth = 1.4;
  ctx.strokeRect(px + 21, py + 21, 14, 14);

  // Kind label (top right)
  ctx.font = `500 10px Outfit, sans-serif`;
  ctx.fillStyle = hue;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(n.kind, px + pw - 16, py + 28);

  // Main label
  ctx.font = `500 ${pw > 180 ? 16 : 13}px Outfit, sans-serif`;
  ctx.fillStyle = '#F6F1E8';
  ctx.textAlign = 'left';
  ctx.fillText(n.label, px + 16, py + ph / 2 + 10);
  ctx.restore();
}

function drawCursor(ctx: CanvasRenderingContext2D, x: number, y: number, name: string, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 12, y + 16);
  ctx.lineTo(x + 5, y + 14);
  ctx.lineTo(x + 3, y + 22);
  ctx.lineTo(x, y + 18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.font = `600 11px Outfit, sans-serif`;
  const tw = ctx.measureText(name).width;
  const lx = x + 14;
  const ly = y + 22;
  ctx.fillStyle = color;
  roundRect(ctx, lx - 8, ly - 13, tw + 16, 20, 999);
  ctx.fill();
  ctx.fillStyle = '#1A140F';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(name, lx, ly + 1);
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}
