/**
 * gridLayout.ts
 *
 * Single source of truth for element grid positions on the canvas.
 * Used by BOTH the renderer (to draw elements) and the interaction
 * hook (to hit-test pointer events against the same positions).
 *
 * All positions are in canvas pixel space for a given (W, H).
 */

export interface GridPlacement {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function getGridPositions(W: number, H: number): Record<string, GridPlacement> {
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
    const ar = {
      x: containerLeft + padding + colW + gap,
      y: containerTop + padding + 12,
      w: colW,
      h: (row1H - gap) / 2,
    };
    const cta = {
      x: containerLeft + padding + colW + gap,
      y: containerTop + padding + 12 + (row1H - gap) / 2 + gap,
      w: colW,
      h: (row1H - gap) / 2,
    };

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
    const ar = {
      x: containerLeft + padding + (colW + gap),
      y: containerTop + padding + 12,
      w: colW,
      h: row1H,
    };
    const cta = {
      x: containerLeft + padding + (colW + gap) * 2,
      y: containerTop + padding + 12,
      w: colW,
      h: row1H,
    };

    const yRow2 = containerTop + padding + 12 + row1H + gap;
    const offer = { x: containerLeft + padding, y: yRow2, w: colW, h: row2H };
    const poll = {
      x: containerLeft + padding + (colW + gap),
      y: yRow2,
      w: colW * 2 + gap,
      h: row2H,
    };

    return { PRODUCT: hero, HOTSPOT: ar, CTA: cta, OFFER: offer, POLL: poll };
  }
}
