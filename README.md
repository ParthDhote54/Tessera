# ⬡ Tessera

> **Real-Time Collaborative Visual Canvas**  
> Compose interactive visual experiences together. In real time.

**[Live Demo →](https://YOUR_DEPLOY_URL)** · Flam AI — Real-Time Multiplayer Cursor / State Sync Assignment

---

## 60-Second Demo

1. Open the deployed URL
2. Click **Create a room** — no signup required
3. Click **Invite** to copy the room link
4. Open the link in a **second browser tab**
5. Watch both cursors appear on the same visual stage
6. Drag an element in Tab A — see it move in Tab B with ownership indicator
7. Close a tab — watch presence update and lock expire

---

## Architecture

```
tessera-frontend/  (React 18 + TypeScript + Vite)
    pages/
        LandingPage.tsx     — product entry, room creation
        RoomPage.tsx        — full collaborative room shell
    components/
        Canvas/CanvasStage  — HTML5 Canvas, rAF rendering loop
        Presence/           — participant avatars + count
        HUD/TelemetryHUD    — real-time RTT, message rate, status
    hooks/
        useWebSocket.ts     — WS lifecycle, reconnect backoff, PING/PONG
        useRoomState.ts     — authoritative state reducer
        useCanvasRenderer.ts — rAF loop, element + cursor drawing
        useElementInteraction.ts — hit test, drag, throttle

tessera-backend/  (Java 17 + Spring Boot 3.x)
    websocket/
        TesseraWebSocketHandler — message routing, disconnect cleanup
        WebSocketConfig         — registers /ws endpoint
    room/
        Room           — in-memory room, seeded scene, atomic locks
        RoomManager    — room lifecycle, scheduled cleanup
    presence/
        Participant    — session identity + WS session
    state/
        CanvasElement  — normalized position element model
    sync/
        SynchronizationService — room broadcast helpers
    controller/
        RoomController — POST /api/rooms, GET /api/health
```

---

## Core Technical Decisions

### Two-Channel State Model

The central engineering idea. Two types of state have fundamentally different handling:

| | Ephemeral (Cursors) | Authoritative (Elements) |
|---|---|---|
| **Frequency** | Up to 60/s | On change only |
| **Storage** | JS Refs, never React state | React reducer |
| **Server role** | Pure relay | Validated, stored |
| **Persistence** | Never | In-memory room state |
| **Reconciliation** | Restart on reconnect | Full resync from server |

### Canvas for Stage Rendering

Remote cursor positions arrive ~60×/second per participant. React state cannot handle this frequency without CPU saturation. The canvas stage uses `requestAnimationFrame` exclusively:

- Remote cursor positions stored in `useRef<Map<sessionId, RemoteCursor>>`
- `rAF` loop reads refs and lerps toward target positions every 16ms
- **Zero React re-renders** per cursor event

### Soft Drag Lock (Conflict Strategy)

One user holds a server-granted lease on an element at a time:

```
User pointerdown → send OBJECT_LOCK
Server: atomically check + grant (synchronized block on Room)
Server: broadcast OBJECT_LOCK{ownerId} to all
Owner: begin drag (optimistic local rendering)
Others: element highlights with owner's color
Owner pointerup → send OBJECT_RELEASE{finalX, finalY}
Server: commit position, release lock, broadcast OBJECT_RELEASE
Disconnect: server expires lease immediately, broadcasts release
```

Why not CRDT/OT: element placement is low-frequency and discrete. Concurrent drag of the same element is extremely rare. Soft locking prevents destructive concurrent updates without operational transform complexity.

### Reconnection Strategy

```
Connected → Connection Lost → Reconnecting
→ Exponential backoff (1s, 2s, 4s, 8s, 16s, 30s max) + ±500ms jitter
→ New WebSocket → JOIN_ROOM sent
→ Server responds with full ROOM_STATE
→ Client reconciles: element positions, participants, locks restored
→ Connected
```

### Coordinate Normalization

All element positions are stored as `[0.0, 1.0]` normalized values. Canvas draws by multiplying by pixel dimensions via `ResizeObserver`. The same logical scene renders correctly across all viewport sizes.

---

## WebSocket Protocol

### Client → Server

| Message | Purpose |
|---|---|
| `JOIN_ROOM` | Associate WS connection with room + identity |
| `CURSOR_MOVE` | Broadcast cursor position (throttled, ephemeral) |
| `OBJECT_LOCK` | Request drag lease on element |
| `OBJECT_MOVE` | Update position while drag lease held |
| `OBJECT_RELEASE` | Commit final position, release lease |
| `PING` | RTT measurement (includes timestamp) |
| `SYNC_REQUEST` | Request full ROOM_STATE resync |

### Server → Client

| Message | Purpose |
|---|---|
| `ROOM_STATE` | Full snapshot on join/resync |
| `USER_JOINED` / `USER_LEFT` | Presence updates |
| `CURSOR_MOVE` | Relayed cursor with sessionId added |
| `OBJECT_LOCK` / `OBJECT_MOVE` / `OBJECT_RELEASE` | Element state changes |
| `PONG` | RTT echo |
| `ERROR` | Typed error with code + message |

---

## Performance

- **Cursor throttle**: outbound at ≥16ms minimum interval using `performance.now()` + ref
- **Object move throttle**: ≤30fps (~33ms) during drag
- **Lerp interpolation**: remote cursors at factor 0.14/frame, elements at 0.10/frame
- **No React state churn**: all high-frequency data in refs, drawn via rAF
- **Validation**: 4KB payload cap, UUID validation, coordinate clamping, room capacity 12

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Rendering | HTML5 Canvas API |
| Routing | React Router v6 |
| Backend | Java 17, Spring Boot 3.x |
| Real-time | Raw WebSocket (Spring WebSocket, no STOMP) |
| Serialization | Jackson |
| Frontend deployment | Vercel |
| Backend deployment | Render.com |

---

## Run Locally

**Prerequisites:** Java 17+, Maven, Node 18+

```bash
# Backend
cd tessera-backend
mvn spring-boot:run
# Server starts on http://localhost:8080

# Frontend (new terminal)
cd tessera-frontend
npm install
npm run dev
# Opens on http://localhost:5173
```

**Environment:** Copy `.env.local` in `tessera-frontend/` (already configured for localhost).

---

## Deployment

**Frontend → Vercel:**
```bash
# In tessera-frontend/
# Set environment variables in Vercel:
# VITE_WS_URL=wss://YOUR_RENDER_URL/ws
# VITE_API_URL=https://YOUR_RENDER_URL
```

**Backend → Render.com:**
- New Web Service → Docker or Maven
- Build command: `mvn package -DskipTests`
- Start command: `java -jar target/tessera-backend-1.0.0.jar`
- WebSocket support: ✓ (Render supports long-lived connections)

> **Note:** Render.com free tier sleeps after 15 minutes inactivity. First connection after sleep may take 15–30 seconds. The frontend reconnection loop handles this automatically.

---

## Known Limitations

- **In-memory only**: room state is lost on server restart
- **Single instance**: horizontal scaling would require shared state (Redis Pub/Sub)
- **No persistence**: sessions and rooms don't survive server restart
- **No authentication**: identity is session-scoped and anonymous
- **Room size**: capped at 12 participants
- **Render.com cold start**: ~15–30s initial delay on free tier

---

## Assignment Context

**Assignment:** Real-Time Multiplayer Cursor / State Sync  
**Stack rationale:** Java/Spring Boot backend chosen deliberately — it's already mastered, the interesting engineering challenge is the real-time synchronization layer, and every technical decision can be confidently defended in an interview. React/TypeScript fills the frontend skill gap honestly.

---

*Built by Parth — Flam AI Software Engineering Internship Assignment*
