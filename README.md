# ⬡ Tessera

> **Real-Time Collaborative Visual Canvas**  
> Compose interactive visual experiences together. In real time.

[![Production Deployment](https://img.shields.io/badge/Production-Live-success?style=for-the-badge)](https://personal-finance-manager-frontends.vercel.app/)
[![Frontend](https://img.shields.io/badge/Frontend-Vercel-black?style=for-the-badge&logo=vercel)](https://personal-finance-manager-frontends.vercel.app/)
[![Backend](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render)](https://tessera-e1w0.onrender.com)
[![WebSocket](https://img.shields.io/badge/WebSocket-wss%3A%2F%2F-blueviolet?style=for-the-badge)](wss://tessera-e1w0.onrender.com/ws)

---

## Live Production Links

- **Production App (Frontend)**: [https://personal-finance-manager-frontends.vercel.app/](https://personal-finance-manager-frontends.vercel.app/)
- **Production Backend REST API**: [https://tessera-e1w0.onrender.com](https://tessera-e1w0.onrender.com)
- **Production WebSocket Service**: `wss://tessera-e1w0.onrender.com/ws`

---

## Quick Try (60-Second Demo)

1. Open the [Tessera Production Web App](https://personal-finance-manager-frontends.vercel.app/)
2. Click **Create a room** — instant workspace creation, no signup required
3. Click **Invite** in the top dock to copy the room URL
4. Open the link in a **second browser tab or window**
5. Move your pointer in Tab A — watch the remote cursor move smoothly in Tab B
6. Drag an element in Tab A — observe atomic visual locking and real-time movement in Tab B
7. Close a tab — watch presence update instantly and locks release automatically

---

## Key Features

- **Multi-User Real-time Cursors**: High-frequency, ultra-smooth pointer stream rendered at 60fps via canvas `requestAnimationFrame` lerp interpolation.
- **Collaborative Canvas Stage**: Drag-and-drop elements with real-time coordinate synchronization across all connected clients.
- **Atomic Drag Locks**: Server-authoritative lease mechanism preventing concurrent drag conflicts with user-colored lock indicators.
- **Presence & Telemetry HUD**: Live participant avatars, active user counters, and real-time round-trip latency (RTT) diagnostics.
- **Normalized Viewport Coordinates**: All position data stored in normalized `[0.0, 1.0]` space, guaranteeing perfect layout parity across desktop, tablet, and mobile screens.
- **Resilient Reconnection**: Exponential backoff reconnection loop with automatic room state resynchronization (`SYNC_REQUEST`).

---

## Architecture Overview

```
Tessera/
├── render.yaml                          # Render Blueprint configuration
├── docs/
│   └── DEPLOYMENT.md                    # Detailed production verification report
├── tessera-backend/                     # Spring Boot 3.2.3 / Java 17 Backend
│   ├── Dockerfile                       # Production multi-stage Docker build
│   ├── pom.xml                          # Maven build dependencies
│   └── src/
│       ├── main/java/com/tessera/
│       │   ├── config/                  # WebMvc CORS configuration
│       │   ├── controller/              # Room & Health REST endpoints
│       │   ├── presence/                # Session identity & Participant model
│       │   ├── protocol/                # WSS Inbound/Outbound DTO contracts
│       │   ├── room/                    # Room memory manager & lease lock logic
│       │   ├── state/                   # Normalized CanvasElement model
│       │   ├── sync/                    # WebSocket broadcast service
│       │   └── websocket/               # Raw WebSocket handler & CORS config
│       └── test/java/com/tessera/       # Automated JUnit 5 test suite (29 tests)
└── tessera-frontend/                    # React 18 + TypeScript + Vite Frontend
    ├── package.json
    ├── vite.config.ts
    ├── vercel.json                      # Vercel SPA rewrite rules
    ├── scripts/                         # Automated QA & E2E verification scripts
    │   ├── qa-production-verification.js
    │   └── qa-browser-production-audit.cjs
    └── src/
        ├── components/                  # Canvas, Presence, Dock, Telemetry HUD
        ├── hooks/                       # WebSocket, RoomState, CanvasRenderer hooks
        └── pages/                       # LandingPage & RoomPage routes
```

---

## Realtime Synchronization Architecture

### 1. Two-Channel State Model

Tessera separates real-time communications into two channels based on data persistence and frequency:

| Dimension | Ephemeral Stream (Cursors) | Authoritative State (Elements) |
|---|---|---|
| **Frequency** | Up to 60 updates/sec | On user interaction only |
| **Storage** | React Refs (`Map<sessionId, RemoteCursor>`) | React Reducer state |
| **Server Role** | Lightweight broadcast relay | Validated, atomic lock, stored in Room |
| **Persistence** | None (purely transient) | In-memory room snapshot |
| **Reconciliation** | Re-initialized on connection | Restored via `ROOM_STATE` snapshot |

### 2. Zero-Render Canvas Loop (`requestAnimationFrame`)

High-frequency cursor movements received over WebSocket do **not** trigger React component re-renders.
- Incoming `CURSOR_MOVE` frames update mutable JavaScript references.
- The `useCanvasRenderer` hook maintains a `requestAnimationFrame` loop that interpolates positions (`lerp`) and draws directly to the HTML5 Canvas 60 times per second.
- High-DPI displays are handled automatically by scaling canvas buffer dimensions via `window.devicePixelRatio`.

### 3. Atomic Soft Drag Locks

To prevent race conditions when two participants interact with the same canvas element:
1. User presses pointer down on an element $\rightarrow$ Sends `OBJECT_LOCK` with `elementId`.
2. Backend checks lock state atomically in a synchronized `Room` block.
3. If free, lock lease is granted to the session and `OBJECT_LOCK` is broadcast to all participants.
4. Remote clients display visual lock indicators matching the owner's assigned color.
5. On pointer release $\rightarrow$ Client sends `OBJECT_RELEASE` with final normalized coordinates `(x, y)`.
6. If a participant disconnects unexpectedly, the server immediately releases all locks held by that session.

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, HTML5 Canvas API, React Router v6
- **Backend**: Java 17, Spring Boot 3.2.3, Spring WebSocket (Raw WebSocket, no STOMP overhead), Jackson
- **Testing**: JUnit 5, Playwright E2E
- **DevOps**: Docker (Multi-stage build), Render (Backend), Vercel (Frontend)

---

## Running Locally

### Prerequisites
- Java 17+
- Maven 3.8+
- Node.js 18+

### 1. Start Backend
```bash
cd tessera-backend
mvn spring-boot:run
```
*Backend starts on `http://localhost:8080` (WebSocket endpoint at `ws://localhost:8080/ws`).*

### 2. Start Frontend
```bash
cd tessera-frontend
npm install
npm run dev
```
*Frontend opens on `http://localhost:5173`.*

---

## Quality Assurance & Automated Testing

### Backend Unit & Integration Tests (JUnit 5)
Run the full backend test suite (29 tests passing):
```bash
cd tessera-backend
mvn test
```

### Production End-to-End & Protocol Verification
Run automated production tests directly against live cloud infrastructure:
```bash
# Verify live REST API & dual-client real-time WebSocket protocol
node tessera-frontend/scripts/qa-production-verification.js

# Verify live Vercel frontend navigation & WebSocket connection in headless browser
node tessera-frontend/scripts/qa-browser-production-audit.cjs
```

---

## Deployment Configuration

- **Frontend (Vercel)**: Configured with `tessera-frontend/vercel.json` for SPA routes. Environment variables:
  - `VITE_WS_URL=wss://tessera-e1w0.onrender.com/ws`
  - `VITE_API_URL=https://tessera-e1w0.onrender.com`
- **Backend (Render)**: Configured with root `render.yaml` and `tessera-backend/Dockerfile`. Environment variables:
  - `PORT=10000`
  - `tessera.cors.allowed-origins=https://personal-finance-manager-frontends.vercel.app`

For the complete production audit report, see [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

---

## Known Architectural Limitations

1. **In-Memory State**: Active room state is maintained in JVM memory (`RoomManager`). State resets if the Render backend container restarts.
2. **Single-Instance Scope**: Multi-node horizontal scaling requires a Redis Pub/Sub adapter to relay messages across instances.
3. **Anonymous Session Identity**: Participants receive ephemeral session IDs upon connecting over WebSocket.

---

*Tessera — Real-Time Multiplayer Cursor & State Sync*
