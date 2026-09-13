// ── Core domain types ─────────────────────────────────────────────────────────

export type ElementType = 'PRODUCT' | 'HOTSPOT' | 'CTA' | 'OFFER' | 'POLL' | 'TRIGGER';

export interface ParticipantData {
  sessionId: string;
  displayName: string;
  color: string;
}

export interface ElementData {
  id: string;
  type: ElementType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  lockedBy: string | null;
}

export interface RoomState {
  roomId: string;
  participants: Map<string, ParticipantData>;
  elements: Map<string, ElementData>;
}

// ── Cursor rendering types ─────────────────────────────────────────────────────

export interface RemoteCursor {
  sessionId: string;
  displayName: string;
  color: string;
  // Rendered position (interpolated)
  x: number;
  y: number;
  // Target position (from server)
  targetX: number;
  targetY: number;
  lastSeen: number; // timestamp
  opacity: number;
}

// ── Connection state ───────────────────────────────────────────────────────────

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

// ── Identity ──────────────────────────────────────────────────────────────────

export interface Identity {
  sessionId: string;
  displayName: string;
  color: string;
}

// ── Telemetry ─────────────────────────────────────────────────────────────────

export interface TelemetryData {
  rtt: number | null;
  msgPerSec: number;
  participantCount: number;
  connectionStatus: ConnectionStatus;
}

// ── Drag state ────────────────────────────────────────────────────────────────

export interface LocalDragState {
  elementId: string;
  offsetX: number; // offset from element origin in normalized coords
  offsetY: number;
  locked: boolean; // server has granted lock
}
