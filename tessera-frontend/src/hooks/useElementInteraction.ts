import { useRef, useCallback } from 'react';
import { ElementData, LocalDragState } from '../types/room';
import { toNorm, clamp } from '../utils/coordinates';
import { ClientMessage } from '../types/events';

const CURSOR_THROTTLE_MS = 16;
const OBJECT_MOVE_THROTTLE_MS = 33;

interface ElementInteractionOptions {
  stageRef: React.RefObject<HTMLCanvasElement>;
  stageWidthRef: React.RefObject<number>;
  stageHeightRef: React.RefObject<number>;
  getElements: () => Map<string, ElementData>;
  getSelectedId: () => string | null;
  setSelectedId: (id: string | null) => void;
  getDragState: () => LocalDragState | null;
  setDragState: (s: LocalDragState | null) => void;
  updateElementOptimistic: (id: string, x: number, y: number) => void;
  send: (msg: ClientMessage) => void;
  ownSessionId: string;
}

export function useElementInteraction(opts: ElementInteractionOptions) {
  const {
    stageRef, stageWidthRef, stageHeightRef,
    getElements, getSelectedId, setSelectedId,
    getDragState, setDragState,
    updateElementOptimistic, send, ownSessionId,
  } = opts;

  const lastCursorSent = useRef(0);
  const lastMoveSent = useRef(0);
  const dragStateRef = useRef<LocalDragState | null>(null);
  dragStateRef.current = getDragState();

  const stageCoords = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = stageRef.current;
    if (!canvas) return { nx: 0, ny: 0 };
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const W = stageWidthRef.current ?? rect.width;
    const H = stageHeightRef.current ?? rect.height;
    return { nx: toNorm(px, W), ny: toNorm(py, H) };
  }, [stageRef, stageWidthRef, stageHeightRef]);

  const hitTest = useCallback((nx: number, ny: number): ElementData | null => {
    const elements = getElements();
    let topmost: ElementData | null = null;
    elements.forEach(el => {
      if (nx >= el.x && nx <= el.x + el.width &&
          ny >= el.y && ny <= el.y + el.height) {
        topmost = el;
      }
    });
    return topmost;
  }, [getElements]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const { nx, ny } = stageCoords(e);

    // Throttled cursor broadcast
    const now = performance.now();
    if (now - lastCursorSent.current >= CURSOR_THROTTLE_MS) {
      lastCursorSent.current = now;
      send({ type: 'CURSOR_MOVE', x: nx, y: ny });
    }

    // Drag handling
    const drag = dragStateRef.current;
    if (!drag) return;

    const targetX = clamp(nx - drag.offsetX);
    const targetY = clamp(ny - drag.offsetY);

    // Optimistic local update
    updateElementOptimistic(drag.elementId, targetX, targetY);

    if (drag.locked && now - lastMoveSent.current >= OBJECT_MOVE_THROTTLE_MS) {
      lastMoveSent.current = now;
      send({ type: 'OBJECT_MOVE', elementId: drag.elementId, x: targetX, y: targetY });
    }
  }, [stageCoords, send, updateElementOptimistic]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = stageRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const { nx, ny } = stageCoords(e);
    const el = hitTest(nx, ny);

    if (!el) {
      setSelectedId(null);
      return;
    }

    setSelectedId(el.id);

    // Don't allow dragging another user's locked element
    if (el.lockedBy && el.lockedBy !== ownSessionId) return;

    const offsetX = nx - el.x;
    const offsetY = ny - el.y;

    const drag: LocalDragState = { elementId: el.id, offsetX, offsetY, locked: false };
    setDragState(drag);

    // Request lock from server
    send({ type: 'OBJECT_LOCK', elementId: el.id });
  }, [stageCoords, hitTest, setSelectedId, setDragState, send, ownSessionId]);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragStateRef.current;
    if (!drag) return;

    const { nx, ny } = stageCoords(e);
    const finalX = clamp(nx - drag.offsetX);
    const finalY = clamp(ny - drag.offsetY);

    if (drag.locked) {
      send({ type: 'OBJECT_RELEASE', elementId: drag.elementId, x: finalX, y: finalY });
    }

    setDragState(null);
  }, [stageCoords, send, setDragState]);

  const onPointerLeave = useCallback(() => {
    // Don't cancel drag on pointer leave (captured pointer continues)
  }, []);

  return { onPointerMove, onPointerDown, onPointerUp, onPointerLeave };
}
