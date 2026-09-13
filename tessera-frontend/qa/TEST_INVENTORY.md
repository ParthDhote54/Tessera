# Tessera Application Test Inventory

## A. Frontend Routes
1. `/` — Landing page with hero section, features, living stage demo, and "Open a room" CTA button.
2. `/room/:roomId` — Collaborative spatial room page with top header, canvas stage, invite hint, and collaboration dock.
3. `*` — Fallback error screen for expired or nonexistent rooms.

## B. Backend REST Endpoints
1. `POST /api/rooms` — Create room (returns `roomId`).
2. `GET /api/rooms/{roomId}` — Get room state metadata (200 OK or 404 Not Found).
3. `GET /api/health` — Health check status endpoint.

## C. Backend WebSocket Endpoints
1. `WS /ws` — WebSocket upgrade endpoint handling JSON messages (`JOIN_ROOM`, `CURSOR_MOVE`, `OBJECT_LOCK`, `OBJECT_MOVE`, `OBJECT_RELEASE`, `PING`, `SYNC_REQUEST`).

## D. Key User Workflows
1. **Room Creation Flow**: User opens landing page -> clicks "Open a room" -> POST `/api/rooms` -> navigated to `/room/{roomId}`.
2. **Direct Room Link Flow**: User navigates directly to `/room/demo-room` -> auto-creates room on backend if absent -> connects via WS -> receives `ROOM_STATE`.
3. **Collaboration Flow**: Client A joins room -> Client B joins same room -> Client A moves element -> Client B receives `OBJECT_MOVE` broadcast -> Client B locks element -> Client A receives `OBJECT_LOCKED` error if attempted concurrently.
4. **Disconnect & Recovery Flow**: Client disconnects -> backend releases locks held by client and broadcasts `USER_LEFT` -> client reconnects -> sends `JOIN_ROOM` -> receives fresh `ROOM_STATE`.

## E. Realtime & State Inventory
1. Participant presence map (sessionId -> displayName, color, wsSession).
2. Canvas element map (elementId -> type, label, x, y, width, height, lockedBy).
3. Lock registry (elementId -> clientSessionId).
4. Remote cursor state (sessionId -> x, y, targetX, targetY, opacity, lastSeen).
