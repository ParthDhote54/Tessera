# Tessera System Architecture

## Overview
Tessera is a real-time, multi-user spatial composition canvas application built with a Java Spring Boot backend and a React + Vite + TypeScript frontend.

---

## 1. System Components

```
┌─────────────────────────────────────────────────────────┐
│                    Tessera Frontend                     │
│  (React 19 + TypeScript + Vite + Canvas + WebSockets)   │
└────────────────────────────┬────────────────────────────┘
                             │
          HTTP (REST)        │  WebSocket (JSON WS)
          port 8080          │  ws://localhost:8080/ws
                             ▼
┌─────────────────────────────────────────────────────────┐
│                    Tessera Backend                      │
│        (Java 21 + Spring Boot 3 + Jackson WS)           │
│                                                         │
│ ┌────────────────┐ ┌────────────────┐ ┌───────────────┐ │
│ │ RoomManager    │ │ Room (State)   │ │ SyncService   │ │
│ └────────────────┘ └────────────────┘ └───────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Component Details

### Frontend Stack (`tessera-frontend`)
- **Framework**: React 19 (`react`, `react-dom`, `react-router-dom`)
- **Build Tool**: Vite 8 + TypeScript 6
- **Realtime**: WebSockets (`useWebSocket` hook with auto-reconnect & ping/pong RTT measurement)
- **Canvas Rendering**: HTML5 Canvas with High-DPI (`window.devicePixelRatio`) scaling and 60 FPS interpolation (`requestAnimationFrame`)
- **Styling**: Vanilla CSS with HSL design system tokens, 12-column grid system, and crisp rendering standards

### Backend Stack (`tessera-backend`)
- **Framework**: Java 21, Spring Boot 3.3.0
- **WebSocket Protocol**: Custom JSON-based protocol over Spring `TextWebSocketHandler`
- **Concurrency & State**: Thread-safe in-memory room management (`ConcurrentHashMap`, atomic synchronized lock acquiring/releasing)
- **Automatic Cleanup**: Scheduled background cleaner (`@Scheduled` every 5 min) for inactive rooms (TTL: 10 minutes)

---

## 3. Communication Protocol

### REST APIs (`RoomController`)
- `POST /api/rooms` — Creates a new room instance with seeded spatial elements.
- `GET /api/rooms/{roomId}` — Retrieves room metadata and active participant count.
- `GET /api/health` — System health check and total active room count.

### WebSocket Messages (`/ws`)
- **Client → Server**:
  - `JOIN_ROOM`: Join room with client session ID, display name, and color.
  - `CURSOR_MOVE`: Broadcast normalized (x, y) cursor coordinates.
  - `OBJECT_LOCK`: Request soft lock on element.
  - `OBJECT_MOVE`: Move locked element to normalized (x, y).
  - `OBJECT_RELEASE`: Release element soft lock and specify final coordinates.
  - `PING`: Network latency probe.
  - `SYNC_REQUEST`: Request complete state re-sync.
- **Server → Client**:
  - `ROOM_STATE`: Initial full room snapshot (participants & elements).
  - `USER_JOINED` / `USER_LEFT`: Participant presence broadcasts.
  - `CURSOR_MOVE`: Remote participant cursor update.
  - `OBJECT_LOCK` / `OBJECT_MOVE` / `OBJECT_RELEASE`: Element lock & motion updates.
  - `PONG` / `ERROR`: Latency response / error notification.
