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
      const dpr = Math.max(1, window.devicePixelRatio || 1);

      // Sync targets from latest element state
      syncElementTargets(opts.getElements());

      // Interpolate element render positions
      elementRenderStates.current.forEach(rs => {
        rs.x = lerp(rs.x, rs.targetX, ELEMENT_LERP);
        rs.y = lerp(rs.y, rs.targetY, ELEMENT_LERP);
      });

      // Clear full backing buffer
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.scale(dpr, dpr);

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

      ctx.restore();

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

interface GridPlacement {
  x: number;
  y: number;
  w: number;
  h: number;
}

function calculateGridPositions(W: number, H: number): Record<string, GridPlacement> {
  const isMobile = W < 768;
  const isTablet = W >= 768 && W < 1200;

  const containerMaxW = Math.min(1360, W - (isMobile ? 24 : 64));
  const containerLeft = (W - containerMaxW) / 2;
  const containerTop = isMobile ? 74 : 96;
  const padding = isMobile ? 16 : 32;
  const gap = isMobile ? 16 : 24;

  const innerW = containerMaxW - padding * 2;

  if (isMobile) {
    const colW = innerW;
    const heroH = 210;
    const secH = 135;

    let currentY = containerTop + padding + 12;
    const hero = { x: containerLeft + padding, y: currentY, w: colW, h: heroH };
    currentY += heroH + gap;

    const ar = { x: containerLeft + padding, y: currentY, w: colW, h: secH };
    currentY += secH + gap;

    const cta = { x: containerLeft + padding, y: currentY, w: colW, h: secH };
    currentY += secH + gap;

    const offer = { x: containerLeft + padding, y: currentY, w: colW, h: secH };
    currentY += secH + gap;

    const poll = { x: containerLeft + padding, y: currentY, w: colW, h: 175 };

    return { PRODUCT: hero, HOTSPOT: ar, CTA: cta, OFFER: offer, POLL: poll };
  } else if (isTablet) {
    const cols = 2;
    const colW = (innerW - gap) / cols;
    const row1H = 260;
    const row2H = 150;

    const hero = { x: containerLeft + padding, y: containerTop + padding + 12, w: colW, h: row1H };
    const ar = { x: containerLeft + padding + colW + gap, y: containerTop + padding + 12, w: colW, h: (row1H - gap) / 2 };
    const cta = { x: containerLeft + padding + colW + gap, y: containerTop + padding + 12 + (row1H - gap) / 2 + gap, w: colW, h: (row1H - gap) / 2 };

    const y2 = containerTop + padding + 12 + row1H + gap;
    const offer = { x: containerLeft + padding, y: y2, w: colW, h: row2H };
    const poll = { x: containerLeft + padding + colW + gap, y: y2, w: colW, h: row2H };

    return { PRODUCT: hero, HOTSPOT: ar, CTA: cta, OFFER: offer, POLL: poll };
  } else {
    // Desktop 3-column balanced grid
    const cols = 3;
    const colW = (innerW - gap * 2) / cols;
    const row1H = 280;
    const row2H = 160;

    const hero = { x: containerLeft + padding, y: containerTop + padding + 12, w: colW, h: row1H };
    const ar = { x: containerLeft + padding + (colW + gap), y: containerTop + padding + 12, w: colW, h: row1H };
    const cta = { x: containerLeft + padding + (colW + gap) * 2, y: containerTop + padding + 12, w: colW, h: row1H };

    const yRow2 = containerTop + padding + 12 + row1H + gap;
    const offer = { x: containerLeft + padding, y: yRow2, w: colW, h: row2H };
    const poll = { x: containerLeft + padding + (colW + gap), y: yRow2, w: colW * 2 + gap, h: row2H };

    return { PRODUCT: hero, HOTSPOT: ar, CTA: cta, OFFER: offer, POLL: poll };
  }
}

function drawStageBackground(ctx: CanvasRenderingContext2D, W: number, H: number) {
  // Rich dark background with clean radial gradient
  const g = ctx.createRadialGradient(W * 0.5, H * 0.45, 40, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
  g.addColorStop(0, '#1C1510');
  g.addColorStop(0.45, '#110D0A');
  g.addColorStop(1, '#060504');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Live Composition Field Container box outline
  const isMobile = W < 768;
  const containerMaxW = Math.min(1360, W - (isMobile ? 24 : 64));
  const containerLeft = Math.round((W - containerMaxW) / 2);
  const containerTop = isMobile ? 74 : 96;
  const containerH = isMobile ? 960 : W < 1200 ? 560 : 556;

  ctx.save();
  ctx.fillStyle = '#100D0A';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 6;
  roundRect(ctx, containerLeft, containerTop, containerMaxW, containerH, 24);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(246, 241, 232, 0.14)';
  ctx.lineWidth = 1;
  roundRect(ctx, containerLeft + 0.5, containerTop + 0.5, containerMaxW - 1, containerH - 1, 24);
  ctx.stroke();

  // Dot grid inside field container
  const SPACING = 28;
  ctx.fillStyle = 'rgba(246, 241, 232, 0.06)';
  for (let x = containerLeft + 28; x < containerLeft + containerMaxW - 14; x += SPACING) {
    for (let y = containerTop + 28; y < containerTop + containerH - 14; y += SPACING) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Field Header Eyebrow (Inside Container)
  ctx.font = '600 11px Outfit, sans-serif';
  ctx.fillStyle = '#E8A87C';
  ctx.textAlign = 'left';
  ctx.fillText('LIVE COMPOSITION FIELD · SPATIAL SYSTEM', containerLeft + 28, containerTop + 24);

  ctx.restore();
}

const ELEMENT_META: Record<string, { color: string; label: string; bg: string }> = {
  PRODUCT: { color: '#E8A87C', label: 'Product', bg: '#1D1610' },
  HOTSPOT: { color: '#9BB8C9', label: 'Hotspot', bg: '#131A1E' },
  CTA:     { color: '#8FBFB0', label: 'CTA', bg: '#121A18' },
  OFFER:   { color: '#D4A017', label: 'Offer', bg: '#1A1608' },
  POLL:    { color: '#C9A0C4', label: 'Poll', bg: '#1A1320' },
  TRIGGER: { color: '#E07A7A', label: 'Trigger', bg: '#201212' },
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
  const gridPositions = calculateGridPositions(W, H);
  const gridPos = gridPositions[el.type];

  const px = gridPos ? Math.round(gridPos.x) : Math.round(toPx(normX, W));
  const py = gridPos ? Math.round(gridPos.y) : Math.round(toPx(normY, H));
  const pw = gridPos ? Math.round(gridPos.w) : Math.round(toPx(el.width, W));
  const ph = gridPos ? Math.round(gridPos.h) : Math.round(toPx(el.height, H));
  const r = 16;

  const meta = ELEMENT_META[el.type] ?? ELEMENT_META.PRODUCT;

  ctx.save();

  // Local drag subtle 1.02 scale
  if (isOwnDrag) {
    ctx.translate(px + pw / 2, py + ph / 2);
    ctx.scale(1.02, 1.02);
    ctx.translate(-(px + pw / 2), -(py + ph / 2));
  }

  // Crisp controlled shadow (no heavy blur)
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;

  ctx.fillStyle = meta.bg;
  roundRect(ctx, px, py, pw, ph, r);
  ctx.fill();

  // Clean subtle top wash
  const wash = ctx.createLinearGradient(px, py, px, py + 60);
  wash.addColorStop(0, meta.color + '26');
  wash.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = wash;
  roundRect(ctx, px, py, pw, ph, r);
  ctx.fill();

  // Reset shadow for inner elements
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Crisp 1px solid border
  if (ownerColor) {
    ctx.strokeStyle = ownerColor;
    ctx.lineWidth = 2;
    roundRect(ctx, px + 0.5, py + 0.5, pw - 1, ph - 1, r);
    ctx.stroke();
  } else if (isSelected) {
    const pulse = Math.sin(now * 0.004) * 0.35 + 0.65;
    ctx.strokeStyle = meta.color;
    ctx.globalAlpha = pulse;
    ctx.lineWidth = 2;
    roundRect(ctx, px - 1.5, py - 1.5, pw + 3, ph + 3, r + 2);
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  } else {
    ctx.strokeStyle = meta.color + '77';
    ctx.lineWidth = 1;
    roundRect(ctx, px + 0.5, py + 0.5, pw - 1, ph - 1, r);
    ctx.stroke();
  }

  // Icon Badge (rounded square with sharp border)
  const badgeSize = 26;
  const badgeX = px + 16;
  const badgeY = py + 16;
  ctx.fillStyle = meta.color + '25';
  roundRect(ctx, badgeX, badgeY, badgeSize, badgeSize, 6);
  ctx.fill();
  ctx.strokeStyle = meta.color + '55';
  ctx.lineWidth = 1;
  roundRect(ctx, badgeX + 0.5, badgeY + 0.5, badgeSize - 1, badgeSize - 1, 6);
  ctx.stroke();

  // Icon inside badge
  drawElementIcon(ctx, el.type, badgeX + badgeSize / 2, badgeY + badgeSize / 2, meta.color);

  // Type pill (top-right corner)
  if (pw >= 110) {
    ctx.font = `600 10px Outfit, sans-serif`;
    const typeText = meta.label;
    const typeMetrics = ctx.measureText(typeText);
    const pillPadding = 8;
    const pillW = Math.round(typeMetrics.width + pillPadding * 2);
    const pillH = 18;
    const pillX = px + pw - pillW - 14;
    const pillY = py + 16;

    ctx.fillStyle = meta.color + '25';
    roundRect(ctx, pillX, pillY, pillW, pillH, 999);
    ctx.fill();
    ctx.strokeStyle = meta.color + '55';
    ctx.lineWidth = 1;
    roundRect(ctx, pillX + 0.5, pillY + 0.5, pillW - 1, pillH - 1, 999);
    ctx.stroke();

    ctx.fillStyle = meta.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typeText, Math.round(pillX + pillW / 2), Math.round(pillY + pillH / 2 + 0.5));
  }

  // Component Contents
  if (el.type === 'PRODUCT') {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `600 20px Outfit, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(el.label, px + 16, py + 54);

    ctx.fillStyle = '#D6CEC4';
    ctx.font = `400 13px Outfit, sans-serif`;
    ctx.fillText('Primary spatial focal point & asset', px + 16, py + 82);

    const boxW = pw - 32;
    const boxH = ph - 140;
    if (boxH > 40) {
      ctx.fillStyle = 'rgba(232, 168, 124, 0.08)';
      ctx.strokeStyle = 'rgba(232, 168, 124, 0.35)';
      ctx.lineWidth = 1;
      roundRect(ctx, px + 16.5, py + 110.5, boxW - 1, boxH - 1, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#E8A87C';
      ctx.font = '600 11px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('3D CANVAS ASSET PREVIEW', Math.round(px + 16 + boxW / 2), Math.round(py + 110 + boxH / 2));
    }
  } else if (el.type === 'HOTSPOT') {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `600 16px Outfit, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(el.label, px + 16, py + 52);

    ctx.fillStyle = '#C4DAE6';
    ctx.font = `400 12px Outfit, sans-serif`;
    ctx.fillText('Spatial tracking anchor active', px + 16, py + 78);

    drawContextualParticipant(ctx, px + 16, py + ph - 34, 'Mira Chen', '#9BB8C9');
  } else if (el.type === 'CTA') {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `600 16px Outfit, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(el.label, px + 16, py + 52);

    const btnW = pw - 32;
    const btnH = 34;
    const btnY = py + ph - 48;
    if (btnH > 20) {
      ctx.fillStyle = meta.color;
      roundRect(ctx, px + 16, btnY, btnW, btnH, 8);
      ctx.fill();

      ctx.fillStyle = '#060504';
      ctx.font = '600 12px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Interactive Link ↗', Math.round(px + 16 + btnW / 2), Math.round(btnY + btnH / 2));
    }
  } else if (el.type === 'OFFER') {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `600 16px Outfit, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(el.label, px + 16, py + 52);

    ctx.fillStyle = '#F0C850';
    ctx.font = `700 24px Outfit, sans-serif`;
    ctx.fillText('20% OFF', px + 16, py + 80);

    ctx.fillStyle = '#D6CEC4';
    ctx.font = `400 11px Outfit, sans-serif`;
    ctx.fillText('Limited time spatial drop', px + 16, py + 116);
  } else if (el.type === 'POLL') {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `600 16px Outfit, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(el.label, px + 16, py + 52);

    const pollW = Math.min(320, pw - 180);
    const pollX = px + 16;
    if (pollW > 100) {
      ctx.fillStyle = 'rgba(201, 160, 196, 0.2)';
      roundRect(ctx, pollX, py + 82, pollW, 22, 6);
      ctx.fill();
      ctx.fillStyle = 'rgba(201, 160, 196, 0.6)';
      roundRect(ctx, pollX, py + 82, Math.round(pollW * 0.68), 22, 6);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '600 11px Outfit, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('Option A (68%)', pollX + 8, py + 93);

      ctx.fillStyle = 'rgba(201, 160, 196, 0.2)';
      roundRect(ctx, pollX, py + 110, pollW, 22, 6);
      ctx.fill();
      ctx.fillStyle = 'rgba(201, 160, 196, 0.5)';
      roundRect(ctx, pollX, py + 110, Math.round(pollW * 0.32), 22, 6);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('Option B (32%)', pollX + 8, py + 121);
    }

    drawContextualParticipant(ctx, px + pw - 110, py + ph - 34, 'Jules Park', '#C9A0C4');
  }

  if (ownerColor) {
    const isYou = isOwnDrag;
    const ownerName = isYou ? 'Editing' : 'Collaborator';
    ctx.font = `600 10px Outfit, sans-serif`;
    ctx.textBaseline = 'alphabetic';
    const tagPadding = 8;
    const tagW = Math.round(ctx.measureText(ownerName).width + tagPadding * 2);
    const tagH = 16;
    const tagX = px;
    const tagY = py - 20;

    ctx.fillStyle = ownerColor;
    roundRect(ctx, tagX, tagY, tagW, tagH, 4);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.textAlign = 'left';
    ctx.fillText(ownerName, tagX + tagPadding, tagY + 11);
  }

  ctx.restore();
}

function drawContextualParticipant(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  name: string,
  color: string
) {
  ctx.save();
  const pad = 6;
  ctx.font = '600 11px Outfit, sans-serif';
  const tw = Math.round(ctx.measureText(name).width);
  const pw = tw + 22 + pad * 2;
  const ph = 20;

  ctx.fillStyle = '#120F0D';
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  roundRect(ctx, Math.round(x) + 0.5, Math.round(y) + 0.5, pw - 1, ph - 1, 999);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(Math.round(x) + 10, Math.round(y) + 10, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, Math.round(x) + 18, Math.round(y) + 10.5);

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
  ctx.font = `600 11px Outfit, sans-serif`;
  ctx.textBaseline = 'alphabetic';
  const tw = ctx.measureText(name).width;
  const labelX = cx + 12;
  const labelY = cy + 20;
  const pad = 6;

  ctx.fillStyle = cursor.color;
  roundRect(ctx, labelX - pad, labelY - 13, tw + pad * 2, 18, 999);
  ctx.fill();

  ctx.fillStyle = '#1A140F';
  ctx.textAlign = 'left';
  ctx.fillText(name, labelX, labelY - 1);

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  radius: number
) {
  const r = Math.min(radius, Math.abs(w) / 2, Math.abs(h) / 2);
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

function truncate(text: string, maxWidth: number, ctx: CanvasRenderingContext2D): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(t + '…').width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + '…';
}

