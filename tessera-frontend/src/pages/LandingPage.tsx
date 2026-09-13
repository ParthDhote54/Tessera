import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

export default function LandingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Full-bleed ambient hero canvas loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Sample elements for ambient demo canvas
    const elements = [
      { id: '1', type: 'Product', label: 'Interactive Canvas', color: '#6366F1', xRatio: 0.65, yRatio: 0.22, w: 160, h: 72 },
      { id: '2', type: 'Hotspot', label: 'AR Anchor', color: '#0EA5E9', xRatio: 0.82, yRatio: 0.45, w: 140, h: 64 },
      { id: '3', type: 'CTA', label: 'Shop Experience', color: '#10B981', xRatio: 0.58, yRatio: 0.62, w: 150, h: 68 },
      { id: '4', type: 'Offer', label: 'Flash Sale 20%', color: '#F59E0B', xRatio: 0.76, yRatio: 0.75, w: 145, h: 64 },
    ];

    const frame = (t: number) => {
      const W = canvas.width;
      const H = canvas.height;

      ctx.clearRect(0, 0, W, H);

      // 1. Solid dark background (#08090B)
      ctx.fillStyle = '#08090B';
      ctx.fillRect(0, 0, W, H);

      // 2. Quiet dot grid (32px pitch)
      const spacing = 32;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      for (let x = spacing; x < W; x += spacing) {
        for (let y = spacing; y < H; y += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 3. Two ghost cursors drifting slowly across the plain dark background
      const cursorA_X = (0.68 + Math.sin(t * 0.0005) * 0.12) * W;
      const cursorA_Y = (0.35 + Math.cos(t * 0.0007) * 0.10) * H;

      const cursorB_X = (0.78 + Math.cos(t * 0.0004) * 0.10) * W;
      const cursorB_Y = (0.62 + Math.sin(t * 0.0006) * 0.12) * H;

      drawDemoCursor(ctx, cursorA_X, cursorA_Y, 'Indigo Fox', '#6366F1');
      drawDemoCursor(ctx, cursorB_X, cursorB_Y, 'Teal Crane', '#10B981');

      animId = requestAnimationFrame(frame);
    };

    animId = requestAnimationFrame(frame);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  const createRoom = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/rooms`, { method: 'POST' });
      if (!res.ok) throw new Error('Server error');
      const data: { roomId: string } = await res.json();
      navigate(`/room/${data.roomId}`);
    } catch {
      setError('Could not reach the server. Make sure the backend is running.');
      setLoading(false);
    }
  };

  return (
    <div className="landing">
      {/* Ambient Live Canvas Hero Background */}
      <div className="landing-canvas-wrapper" aria-hidden="true">
        <canvas ref={canvasRef} className="landing-canvas" />
      </div>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="landing-header">
        <div className="landing-logo">
          <span className="logo-mark">⬡</span>
          <span className="logo-name">Tessera</span>
        </div>
        <a
          href="https://github.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="landing-gh-link"
          aria-label="GitHub"
        >
          <GitHubIcon />
        </a>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <main className="landing-main">
        <div className="landing-hero-content">
          <h1 className="landing-headline">
            Compose together.<br />
            <span className="mosaic-accent">In real time.</span>
          </h1>

          <p className="landing-sub">
            A shared interactive workspace for building visual experiences — live,
            with everyone's cursor visible and every change instantly synchronized.
          </p>

          <div className="landing-actions">
            <button
              id="create-room-btn"
              className="btn-primary btn-hero-glow"
              onClick={createRoom}
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Creating room…
                </>
              ) : (
                <>
                  <span aria-hidden="true">⬡</span>
                  Create a room
                </>
              )}
            </button>
            <p className="landing-hint">No sign-up · Instant start · Share a link</p>
          </div>

          {error && (
            <div className="landing-error" role="alert">
              {error}
            </div>
          )}
        </div>
      </main>

      <footer className="landing-footer">
        <span>Built by Parth · Flam AI Assignment</span>
      </footer>
    </div>
  );
}

function drawDemoCursor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  name: string,
  color: string
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 10, y + 14);
  ctx.lineTo(x + 4, y + 12);
  ctx.lineTo(x + 2, y + 18);
  ctx.lineTo(x, y + 15);
  ctx.lineTo(x - 1, y + 9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.font = `500 11px 'Plus Jakarta Sans', sans-serif`;
  const tw = ctx.measureText(name).width;
  const labelX = x + 12;
  const labelY = y + 20;
  const pad = 6;

  ctx.fillStyle = color;
  roundRect(ctx, labelX - pad, labelY - 13, tw + pad * 2, 18, 999);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.fillText(name, labelX, labelY - 1);
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function GitHubIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

