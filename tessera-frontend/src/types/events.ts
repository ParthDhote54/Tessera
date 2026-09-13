import type { ParticipantData, ElementData } from './room';

// ── Server → Client message types ────────────────────────────────────────────

export interface RoomStateMessage {
  type: 'ROOM_STATE';
  roomId: string;
  participants: ParticipantData[];
  elements: ElementData[];
}

export interface UserJoinedMessage {
  type: 'USER_JOINED';
  sessionId: string;
  displayName: string;
  color: string;
}

export interface UserLeftMessage {
  type: 'USER_LEFT';
  sessionId: string;
}

export interface CursorMoveMessage {
  type: 'CURSOR_MOVE';
  sessionId: string;
  x: number;
  y: number;
}

export interface ObjectLockMessage {
  type: 'OBJECT_LOCK';
  elementId: string;
  lockedBy: string;
}

export interface ObjectMoveMessage {
  type: 'OBJECT_MOVE';
  elementId: string;
  x: number;
  y: number;
}

export interface ObjectReleaseMessage {
  type: 'OBJECT_RELEASE';
  elementId: string;
  x: number;
  y: number;
}

export interface PongMessage {
  type: 'PONG';
  timestamp: number;
}

export interface ErrorMessage {
  type: 'ERROR';
  code: string;
  message: string;
}

export type ServerMessage =
  | RoomStateMessage
  | UserJoinedMessage
  | UserLeftMessage
  | CursorMoveMessage
  | ObjectLockMessage
  | ObjectMoveMessage
  | ObjectReleaseMessage
  | PongMessage
  | ErrorMessage;

// ── Client → Server message types ────────────────────────────────────────────

export interface JoinRoomPayload {
  type: 'JOIN_ROOM';
  roomId: string;
  sessionId: string;
  displayName: string;
  color: string;
}

export interface CursorMovePayload {
  type: 'CURSOR_MOVE';
  x: number;
  y: number;
}

export interface ObjectLockPayload {
  type: 'OBJECT_LOCK';
  elementId: string;
}

export interface ObjectMovePayload {
  type: 'OBJECT_MOVE';
  elementId: string;
  x: number;
  y: number;
}

export interface ObjectReleasePayload {
  type: 'OBJECT_RELEASE';
  elementId: string;
  x: number;
  y: number;
}

export interface PingPayload {
  type: 'PING';
  timestamp: number;
}

export interface SyncRequestPayload {
  type: 'SYNC_REQUEST';
}

export type ClientMessage =
  | JoinRoomPayload
  | CursorMovePayload
  | ObjectLockPayload
  | ObjectMovePayload
  | ObjectReleasePayload
  | PingPayload
  | SyncRequestPayload;
