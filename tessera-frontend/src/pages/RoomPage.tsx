import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CanvasStage } from '../components/Canvas/CanvasStage';
import { CollaborationDock } from '../components/Dock/CollaborationDock';
import { useWebSocket } from '../hooks/useWebSocket';
import { useRoomState } from '../hooks/useRoomState';
import { ServerMessage } from '../types/events';
import { ConnectionStatus, LocalDragState, RemoteCursor } from '../types/room';
import { getOrCreateIdentity } from '../utils/identity';

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const identity = getOrCreateIdentity();

  // ── Connection & Room State ──────────────────────────────────────────────
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [rtt, setRtt] = useState<number | null>(null);
  const msgCountRef = useRef(0);
  const [msgPerSec, setMsgPerSec] = useState(0);
  const [copied, setCopied] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [dragState, setDragState] = useState<LocalDragState | null>(null);

  const {
    roomState,
    applyRoomState, applyUserJoined, applyUserLeft,
    applyObjectLock, applyObjectMove, applyObjectRelease,
    reset,
  } = useRoomState();

  // ── Remote cursors (ref — never in React state) ──────────────────────────
  const remoteCursors = useRef<Map<string, RemoteCursor>>(new Map());

  // ── Participant color lookup ───────────────────────────────────────────────
  const getParticipantColor = useCallback((sessionId: string): string => {
    if (sessionId === identity.sessionId) return identity.color;
    return roomState.participants.get(sessionId)?.color ?? '#6366F1';
  }, [roomState.participants, identity]);

  // ── Message handler ───────────────────────────────────────────────────────
  const onMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case 'ROOM_STATE':
        applyRoomState(msg);
        // Rebuild remote cursors from participant list
        remoteCursors.current = new Map(
          msg.participants
            .filter(p => p.sessionId !== identity.sessionId)
            .map(p => [p.sessionId, {
              sessionId: p.sessionId,
              displayName: p.displayName,
              color: p.color,
              x: 0.5, y: 0.5,
              targetX: 0.5, targetY: 0.5,
              lastSeen: Date.now(),
              opacity: 0,
            }])
        );
        break;

      case 'USER_JOINED':
        applyUserJoined(msg);
        if (msg.sessionId !== identity.sessionId) {
          remoteCursors.current.set(msg.sessionId, {
            sessionId: msg.sessionId,
            displayName: msg.displayName,
            color: msg.color,
            x: 0.5, y: 0.5,
            targetX: 0.5, targetY: 0.5,
            lastSeen: Date.now(),
            opacity: 0,
          });
        }
        break;

      case 'USER_LEFT':
        applyUserLeft(msg);
        remoteCursors.current.delete(msg.sessionId);
        break;

      case 'CURSOR_MOVE': {
        const c = remoteCursors.current.get(msg.sessionId);
        if (c) {
          c.targetX = msg.x;
          c.targetY = msg.y;
          c.lastSeen = Date.now();
        }
        break;
      }

      case 'OBJECT_LOCK':
        applyObjectLock(msg);
        // Grant local drag lock if we are the lock holder
        if (msg.lockedBy === identity.sessionId) {
          setDragState(prev => prev ? { ...prev, locked: true } : null);
        }
        break;

      case 'OBJECT_MOVE':
        applyObjectMove(msg);
        break;

      case 'OBJECT_RELEASE':
        applyObjectRelease(msg);
        break;

      case 'ERROR':
        if (msg.code === 'ROOM_NOT_FOUND') {
          setRoomError('Room not found or has expired.');
        }
        break;
    }
  }, [
    identity.sessionId, identity.color,
    applyRoomState, applyUserJoined, applyUserLeft,
    applyObjectLock, applyObjectMove, applyObjectRelease,
  ]);

  // ── WebSocket ─────────────────────────────────────────────────────────────
  const { send } = useWebSocket({
    onMessage,
    onStatusChange: (status) => {
      setConnectionStatus(status);
      if (status === 'reconnecting') {
        reset();
        remoteCursors.current.clear();
      }
    },
    onRtt: setRtt,
    onMessageReceived: () => { msgCountRef.current++; },
  });

  // Join room whenever connection becomes 'connected' (initial + reconnect)
  useEffect(() => {
    if (connectionStatus === 'connected' && roomId) {
      send({
        type: 'JOIN_ROOM',
        roomId,
        sessionId: identity.sessionId,
        displayName: identity.displayName,
        color: identity.color,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionStatus]);

  // Message rate counter
  useEffect(() => {
    const interval = setInterval(() => {
      setMsgPerSec(msgCountRef.current);
      msgCountRef.current = 0;
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Element optimistic update (for own drag) ──────────────────────────────
  const handleElementOptimisticUpdate = useCallback((id: string, x: number, y: number) => {
    // The canvas reads from the live ref — no React state update needed
    const el = roomState.elements.get(id);
    if (el) {
      roomState.elements.set(id, { ...el, x, y });
    }
  }, [roomState.elements]);

  // ── Invite ────────────────────────────────────────────────────────────────
  const copyInvite = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Room error screen ─────────────────────────────────────────────────────
  if (roomError) {
    return (
      <div className="room-error-screen">
        <div className="room-error-card">
          <div className="room-error-badge" aria-hidden="true">
            <svg className="tessera-mark" width="22" height="22" viewBox="0 0 22 22">
              <path fill="currentColor" d="M11 1.4 19.4 6v10L11 20.6 2.6 16V6L11 1.4Zm0 2.3L4.8 7.1v7.8L11 18.3l6.2-3.4V7.1L11 3.7Zm0 3.2 3.8 2.1v4.2L11 15.3l-3.8-2.1V9l3.8-2.1Z" />
            </svg>
          </div>
          <h1 className="room-error-title">{roomError}</h1>
          <p className="room-error-desc">
            This session link is invalid or the room has expired. Open a new room to start composing.
          </p>
          <div className="room-error-actions">
            <button className="btn-hero invert" onClick={() => navigate('/')}>
              Open a new room
            </button>
          </div>
        </div>
      </div>
    );
  }

  const shortRoomId = roomId ? roomId.slice(0, 8) : '';

  return (
    <div className="room-layout">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="room-header">
        <div className="room-header-left">
          <button className="logo-link" onClick={() => navigate('/')} aria-label="Tessera home">
            <svg className="tessera-mark" width="18" height="18" viewBox="0 0 22 22" aria-hidden="true">
              <path fill="currentColor" d="M11 1.4 19.4 6v10L11 20.6 2.6 16V6L11 1.4Zm0 2.3L4.8 7.1v7.8L11 18.3l6.2-3.4V7.1L11 3.7Zm0 3.2 3.8 2.1v4.2L11 15.3l-3.8-2.1V9l3.8-2.1Z" />
            </svg>
            <span className="logo-name-sm">Tessera</span>
          </button>
          <div className="room-id-chip" title={roomId}>
            <span className="room-id-label">Room</span>
            <span className="room-id-value">{shortRoomId}</span>
          </div>
        </div>

        <div className="room-header-right">
          {roomState.participants.size <= 1 && connectionStatus === 'connected' && (
            <div className="invite-hint-pill">
              <span>Alone in room</span>
              <button className="btn-hint-invite" onClick={copyInvite}>
                Copy link
              </button>
            </div>
          )}
          <button
            id="invite-btn"
            className={`btn-invite ${copied ? 'copied' : ''}`}
            onClick={copyInvite}
            aria-label="Copy invite link"
          >
            {copied ? 'Copied' : 'Invite'}
          </button>
        </div>
      </header>

      {/* ── Canvas Stage ────────────────────────────────────────────────── */}
      <main className="room-stage-container">
        {/* Connection overlay */}
        {(connectionStatus === 'connecting' || connectionStatus === 'reconnecting') && (
          <div className="connection-overlay" role="status">
            <div className="connection-overlay-content">
              <span className="spinner" />
              <span>{connectionStatus === 'connecting' ? 'Connecting to room…' : 'Reconnecting…'}</span>
            </div>
          </div>
        )}

        {connectionStatus === 'disconnected' && (
          <div className="connection-overlay error-overlay" role="alert">
            <div className="connection-overlay-content">
              <span>⚠ Connection lost</span>
              <button className="btn-secondary" onClick={() => window.location.reload()}>
                Retry
              </button>
            </div>
          </div>
        )}

        <CanvasStage
          elements={roomState.elements}
          remoteCursors={remoteCursors}
          send={send}
          ownSessionId={identity.sessionId}
          getParticipantColor={getParticipantColor}
          onDragStateChange={setDragState}
          onElementOptimisticUpdate={handleElementOptimisticUpdate}
          onLockGranted={(elementId) => {
            setDragState(prev =>
              prev?.elementId === elementId ? { ...prev, locked: true } : prev
            );
          }}
        />
      </main>

      {/* ── Unified Collaboration & Telemetry Floating Dock ────────────── */}
      <CollaborationDock
        participants={roomState.participants}
        ownSessionId={identity.sessionId}
        ownDisplayName={identity.displayName}
        ownColor={identity.color}
        connectionStatus={connectionStatus}
        rtt={rtt}
        msgPerSec={msgPerSec}
      />
    </div>
  );
}

