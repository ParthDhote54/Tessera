import { useEffect, useRef, useCallback } from 'react';
import { ElementData, RemoteCursor, LocalDragState } from '../types/room';
import { lerp, toPx } from '../utils/coordinates';

const CURSOR_LERP = 0.14;
const ELEMENT_LERP = 0.10;
const CURSOR_IDLE_START = 5000;
const CURSOR_FADE_DURATION = 1200;

// Per-element render state (interpolated positions)
interface ElementRenderState {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
}

interface RendererOptions {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  stageWidthRef: React.RefObject<number>;
  stageHeightRef: React.RefObject<number>;
  getElements: () => Map<string, ElementData>;
  getRemoteCursors: () => Map<string, RemoteCursor>;
  getDragState: () => LocalDragState | null;
  getSelectedId: () => string | null;
  getOwnSessionId: () => string;
  getParticipantColor: (sessionId: string) => string;
}

export function useCanvasRenderer(opts: RendererOptions) {
  const rafRef = useRef<number>(0);
  const elementRenderStates = useRef<Map<string, ElementRenderState>>(new Map());

  // Update element render target when authoritative state changes
  const syncElementTargets = useCallback((elements: Map<string, ElementData>) => {
    elements.forEach((el, id) => {
      const rs = elementRenderStates.current.get(id);
      if (!rs) {
        // First time seeing this element — snap to position
        elementRenderStates.current.set(id, {
          x: el.x, y: el.y, targetX: el.x, targetY: el.y
        });
      } else {
        rs.targetX = el.x;
        rs.targetY = el.y;
      }
    });
    // Remove stale render states
    elementRenderStates.current.forEach((_, id) => {
      if (!elements.has(id)) elementRenderStates.current.delete(id);
    });
  }, []);

  const startLoop = useCallback(() => {
    const canvas = opts.canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frame = (now: number) => {
      const W = opts.stageWidthRef.current ?? canvas.width;
      const H = opts.stageHeightRef.current ?? canvas.height;

      // Sync targets from latest element state
      syncElementTargets(opts.getElements());

      // Interpolate element render positions
      elementRenderStates.current.forEach(rs => {
        rs.x = lerp(rs.x, rs.targetX, ELEMENT_LERP);
        rs.y = lerp(rs.y, rs.targetY, ELEMENT_LERP);
      });

      // Clear
      ctx.clearRect(0, 0, W, H);

      // Draw stage background with dot grid and edge vignette
      drawStageBackground(ctx, W, H);

      // Draw elements
      const elements = opts.getElements();
      const dragState = opts.getDragState();
      const selectedId = opts.getSelectedId();

      elements.forEach((el) => {
        const rs = elementRenderStates.current.get(el.id);
        const renderX = rs ? rs.x : el.x;
        const renderY = rs ? rs.y : el.y;

        // Override with drag position for own dragged element
        const isDragging = dragState?.elementId === el.id && dragState.locked;
        const drawX = isDragging ? el.x : renderX; // el.x updated optimistically
        const drawY = isDragging ? el.y : renderY;

        const ownerColor = el.lockedBy
          ? opts.getParticipantColor(el.lockedBy)
          : null;
        const isSelected = selectedId === el.id;
        const ownSessionId = opts.getOwnSessionId();
        const isOwnDrag = isDragging && el.lockedBy === ownSessionId;

        drawElement(ctx, el, drawX, drawY, W, H, ownerColor, isSelected, isOwnDrag, now);
      });

      // Draw remote cursors
      const now2 = now;
      opts.getRemoteCursors().forEach((cursor) => {
        // Interpolate
        cursor.x = lerp(cursor.x, cursor.targetX, CURSOR_LERP);
        cursor.y = lerp(cursor.y, cursor.targetY, CURSOR_LERP);

        // Compute opacity (idle fade)
        const elapsed = now2 - cursor.lastSeen;
        if (elapsed > CURSOR_IDLE_START + CURSOR_FADE_DURATION) {
          cursor.opacity = 0;
          return;
        }
        if (elapsed > CURSOR_IDLE_START) {
          cursor.opacity = 1 - (elapsed - CURSOR_IDLE_START) / CURSOR_FADE_DURATION;
        } else {
          cursor.opacity = 1;
        }

        if (cursor.opacity <= 0.01) return;
        drawCursor(ctx, cursor, W, H);
      });

      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const stop = startLoop();
    return () => { if (stop) stop(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

// ── Drawing functions ─────────────────────────────────────────────────────────

function drawStageBackground(ctx: CanvasRenderingContext2D, W: number, H: number) {
  // Pure dark canvas background (#000000)
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);

  // Quiet dot grid with 32px spacing
  const SPACING = 32;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  for (let x = SPACING; x < W; x += SPACING) {
    for (let y = SPACING; y < H; y += SPACING) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

const ELEMENT_META: Record<string, { color: string; label: string; bg: string }> = {
  PRODUCT: { color: '#00D9FF', label: 'Product', bg: '#121316' },
  HOTSPOT: { color: '#0EA5E9', label: 'Hotspot', bg: '#121316' },
  CTA:     { color: '#10B981', label: 'CTA', bg: '#121316' },
  OFFER:   { color: '#F59E0B', label: 'Offer', bg: '#121316' },
  POLL:    { color: '#D946EF', label: 'Poll', bg: '#121316' },
  TRIGGER: { color: '#F43F5E', label: 'Trigger', bg: '#121316' },
};

function drawElement(
  ctx: CanvasRenderingContext2D,
  el: ElementData,
  normX: number, normY: number,
  W: number, H: number,
  ownerColor: string | null,
  isSelected: boolean,
  isOwnDrag: boolean,
  now: number
) {
  const meta = ELEMENT_META[el.type] ?? ELEMENT_META.PRODUCT;
  const px = toPx(normX, W);
  const py = toPx(normY, H);
  const pw = toPx(el.width, W);
  const ph = toPx(el.height, H);
  const r = 14; // Hierarchy: canvas cards get 14px radius

  ctx.save();

  // Local drag subtle 1.02 scale
  if (isOwnDrag) {
    ctx.translate(px + pw / 2, py + ph / 2);
    ctx.scale(1.02, 1.02);
    ctx.translate(-(px + pw / 2), -(py + ph / 2));
  }

  // Tinted shadow matching element's own accent color (or lock color)
  const shadowHue = ownerColor || meta.color;
  ctx.shadowColor = ownerColor
    ? ownerColor
    : isSelected
    ? meta.color
    : shadowHue + '30'; // accent hue low opacity tint shadow
  ctx.shadowBlur = ownerColor ? 24 : isSelected ? 18 : 12;
  ctx.shadowOffsetY = 4;

  // Card surface
  ctx.fillStyle = meta.bg;
  roundRect(ctx, px, py, pw, ph, r);
  ctx.fill();

  // Reset shadow for inner elements
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Border: subtle neutral or active lock/selection ring
  if (ownerColor) {
    ctx.strokeStyle = ownerColor;
    ctx.lineWidth = 2;
    roundRect(ctx, px, py, pw, ph, r);
    ctx.stroke();
  } else if (isSelected) {
    // Pulsing selection ring in user's / element's color
    const pulse = Math.sin(now * 0.004) * 0.35 + 0.65;
    ctx.strokeStyle = meta.color;
    ctx.globalAlpha = pulse;
    ctx.lineWidth = 2;
    roundRect(ctx, px - 2, py - 2, pw + 4, ph + 4, r + 2);
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  } else {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    roundRect(ctx, px, py, pw, ph, r);
    ctx.stroke();
  }

  // Icon Badge (rounded square with low-opacity accent fill)
  const badgeSize = 26;
  const badgeX = px + 12;
  const badgeY = py + 12;
  ctx.fillStyle = meta.color + '20';
  roundRect(ctx, badgeX, badgeY, badgeSize, badgeSize, 6);
  ctx.fill();

  // Icon inside badge
  drawElementIcon(ctx, el.type, badgeX + badgeSize / 2, badgeY + badgeSize / 2, meta.color);

  // Sentence-case type pill (top-right corner)
  ctx.font = `500 10px 'Plus Jakarta Sans', sans-serif`;
  const typeText = meta.label;
  const typeMetrics = ctx.measureText(typeText);
  const pillPadding = 6;
  const pillW = typeMetrics.width + pillPadding * 2;
  const pillH = 16;
  const pillX = px + pw - pillW - 10;
  const pillY = py + 12;

  ctx.fillStyle = meta.color + '18';
  roundRect(ctx, pillX, pillY, pillW, pillH, 999);
  ctx.fill();

  ctx.fillStyle = meta.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(typeText, pillX + pillW / 2, pillY + pillH / 2 + 0.5);

  // Main title / label (Plus Jakarta Sans)
  ctx.fillStyle = '#F5F4F0';
  ctx.font = `500 ${pw > 130 ? 13 : 11}px 'Plus Jakarta Sans', sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const labelX = px + 12;
  const labelY = py + (ph > 60 ? ph / 2 + 14 : ph / 2 + 4);
  ctx.fillText(truncate(el.label, pw - 24, ctx), labelX, labelY);

  // Owner indicator tag if locked/dragged
  if (ownerColor) {
    const ownerName = el.lockedBy ? 'Collaborator' : '';
    ctx.font = `500 10px 'Plus Jakarta Sans', sans-serif`;
    ctx.fillStyle = ownerColor;
    roundRect(ctx, px, py - 18, Math.max(60, ctx.measureText(ownerName).width + 12), 16, 4);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(ownerName || 'Editing', px + 6, py - 6);
  }

  ctx.restore();
}

function drawElementIcon(ctx: CanvasRenderingContext2D, type: string, cx: number, cy: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (type) {
    case 'PRODUCT':
      // Box icon
      ctx.beginPath();
      ctx.strokeRect(cx - 5, cy - 5, 10, 10);
      break;
    case 'HOTSPOT':
      // Pin dot
      ctx.beginPath();
      ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'CTA':
      // Action bolt
      ctx.beginPath();
      ctx.moveTo(cx + 1, cy - 6);
      ctx.lineTo(cx - 4, cy + 1);
      ctx.lineTo(cx, cy + 1);
      ctx.lineTo(cx - 1, cy + 6);
      ctx.lineTo(cx + 4, cy - 1);
      ctx.lineTo(cx, cy - 1);
      ctx.closePath();
      ctx.fill();
      break;
    case 'OFFER':
      // Tag
      ctx.beginPath();
      ctx.strokeRect(cx - 5, cy - 4, 10, 8);
      ctx.beginPath();
      ctx.arc(cx - 2, cy, 1, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'POLL':
      // Bar chart
      ctx.fillRect(cx - 5, cy + 1, 2, 4);
      ctx.fillRect(cx - 1, cy - 4, 2, 9);
      ctx.fillRect(cx + 3, cy - 1, 2, 6);
      break;
    default:
      // Diamond / generic
      ctx.beginPath();
      ctx.moveTo(cx, cy - 5);
      ctx.lineTo(cx + 5, cy);
      ctx.lineTo(cx, cy + 5);
      ctx.lineTo(cx - 5, cy);
      ctx.closePath();
      ctx.stroke();
      break;
  }
  ctx.restore();
}

function drawCursor(
  ctx: CanvasRenderingContext2D,
  cursor: RemoteCursor,
  W: number,
  H: number
) {
  const cx = toPx(cursor.x, W);
  const cy = toPx(cursor.y, H);

  ctx.save();
  ctx.globalAlpha = cursor.opacity;

  // Cursor pointer shape
  ctx.fillStyle = cursor.color;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + 10, cy + 14);
  ctx.lineTo(cx + 4, cy + 12);
  ctx.lineTo(cx + 2, cy + 18);
  ctx.lineTo(cx, cy + 15);
  ctx.lineTo(cx - 1, cy + 9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Name label (Plus Jakarta Sans)
  const name = cursor.displayName;
  ctx.font = `500 11px 'Plus Jakarta Sans', sans-serif`;
  ctx.textBaseline = 'alphabetic';
  const tw = ctx.measureText(name).width;
  const labelX = cx + 12;
  const labelY = cy + 20;
  const pad = 6;

  ctx.fillStyle = cursor.color;
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
  radius: number | [number, number, number, number]
) {
  const r = Array.isArray(radius)
    ? radius
    : [radius, radius, radius, radius];
  ctx.beginPath();
  ctx.moveTo(x + r[0], y);
  ctx.lineTo(x + w - r[1], y);
  ctx.arcTo(x + w, y, x + w, y + r[1], r[1]);
  ctx.lineTo(x + w, y + h - r[2]);
  ctx.arcTo(x + w, y + h, x + w - r[2], y + h, r[2]);
  ctx.lineTo(x + r[3], y + h);
  ctx.arcTo(x, y + h, x, y + h - r[3], r[3]);
  ctx.lineTo(x, y + r[0]);
  ctx.arcTo(x, y, x + r[0], y, r[0]);
  ctx.closePath();
}

function truncate(text: string, maxWidth: number, ctx: CanvasRenderingContext2D): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(t + '…').width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + '…';
}

