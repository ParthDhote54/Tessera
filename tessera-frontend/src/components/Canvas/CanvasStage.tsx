import { useRef, useState, useCallback, useEffect } from 'react';
import { ElementData, RemoteCursor, LocalDragState } from '../../types/room';
import { ClientMessage } from '../../types/events';
import { useCanvasRenderer } from '../../hooks/useCanvasRenderer';
import { useElementInteraction } from '../../hooks/useElementInteraction';

interface CanvasStageProps {
  elements: Map<string, ElementData>;
  remoteCursors: React.RefObject<Map<string, RemoteCursor>>;
  send: (msg: ClientMessage) => void;
  ownSessionId: string;
  getParticipantColor: (sessionId: string) => string;
  onDragStateChange: (state: LocalDragState | null) => void;
  onElementOptimisticUpdate: (id: string, x: number, y: number) => void;
  onLockGranted: (elementId: string) => void;
}

export function CanvasStage({
  elements, remoteCursors, send,
  ownSessionId, getParticipantColor,
  onDragStateChange, onElementOptimisticUpdate, onLockGranted,
}: CanvasStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null!);
  const stageWidthRef = useRef<number>(0);
  const stageHeightRef = useRef<number>(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<LocalDragState | null>(null);
  const dragStateRef = useRef<LocalDragState | null>(null);
  dragStateRef.current = dragState;

  // Sync dragState up
  const handleSetDragState = useCallback((s: LocalDragState | null) => {
    setDragState(s);
    onDragStateChange(s);
  }, [onDragStateChange]);

  // Optimistic element position for own drag
  const localElements = useRef<Map<string, ElementData>>(new Map());
  localElements.current = elements;

  const updateElementOptimistic = useCallback((id: string, x: number, y: number) => {
    const el = localElements.current.get(id);
    if (el) {
      // Mutate the ref map directly — only Canvas reads this, no React rerender needed
      localElements.current = new Map(localElements.current);
      localElements.current.set(id, { ...el, x, y });
    }
    onElementOptimisticUpdate(id, x, y);
  }, [onElementOptimisticUpdate]);

  // Expose dragState with lock status accessible from parent
  useEffect(() => {
    if (dragState) onDragStateChange(dragState);
  }, [dragState, onDragStateChange]);

  // ResizeObserver
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.width = width;
        canvas.height = height;
        stageWidthRef.current = width;
        stageHeightRef.current = height;
      }
    });
    ro.observe(canvas);
    // Initial size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    stageWidthRef.current = rect.width;
    stageHeightRef.current = rect.height;
    return () => ro.disconnect();
  }, []);

  // Canvas renderer
  useCanvasRenderer({
    canvasRef,
    stageWidthRef,
    stageHeightRef,
    getElements: () => localElements.current,
    getRemoteCursors: () => remoteCursors.current ?? new Map(),
    getDragState: () => dragStateRef.current,
    getSelectedId: () => selectedId,
    getOwnSessionId: () => ownSessionId,
    getParticipantColor,
  });

  const { onPointerMove, onPointerDown, onPointerUp, onPointerLeave } = useElementInteraction({
    stageRef: canvasRef,
    stageWidthRef,
    stageHeightRef,
    getElements: () => localElements.current,
    getSelectedId: () => selectedId,
    setSelectedId,
    getDragState: () => dragStateRef.current,
    setDragState: handleSetDragState,
    updateElementOptimistic,
    send,
    ownSessionId,
  });

  return (
    <canvas
      ref={canvasRef}
      className="canvas-stage"
      onPointerMove={onPointerMove}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      aria-label="Collaborative canvas stage"
      style={{
        cursor: dragState ? 'grabbing' : 'crosshair',
        touchAction: 'none',
      }}
    />
  );
}
