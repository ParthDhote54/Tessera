# API & Realtime Protocol Coverage & Depth Audit

This document details the deep validation, error payload structure assertions, and empirical evidence for every HTTP endpoint and WebSocket message handler in the Tessera application.

---

## 1. REST Endpoints Summary

| Method | Path | Controller | Primary Purpose | Test Evidence | Depth Verification Level |
|---|---|---|---|---|---|
| `POST` | `/api/rooms` | `RoomController` | Create room with default element set | `testCreateRoom_returnsOkWithRoomId` | Verifies `200 OK`, JSON body contains `roomId` string, and auto-initializes 5 seed elements. |
| `GET` | `/api/rooms/{id}` | `RoomController` | Retrieve room state & participants | `testGetRoom_returnsMetadata` | Verifies `200 OK`, response body matches requested ID and returns active session data. |
| `GET` | `/api/health` | `HealthController` | Service readiness check | `testHealthCheck` | Verifies `200 OK` and `{ status: "ok" }`. |

---

## 2. WebSocket Protocol Handler Deep Verification (`/ws/canvas`)

Every WebSocket test uses Mockito `ArgumentCaptor` to deserialize and inspect the exact JSON payload map returned by `SynchronizationService.sendTo()` and `broadcastToRoom()`.

### 2.1 `JOIN_ROOM`
- **Handler**: `TesseraWebSocketHandler.handleJoinRoom`

| Test Scenario | Method | Verified Payload Structure | Result |
|---|---|---|---|
| **Valid Join** | `wsHandler_joinRoom_validPayload_sendsStateAndBroadcasts` | `type: "ROOM_STATE"`, `roomId: "test-room-id"`, elements array present; broadcasts `type: "USER_JOINED"`. | PASS |
| **Max Display Name** | `wsHandler_displayNameTooLong_verifiesExactErrorPayload` | `type: "ERROR"`, `code: "INVALID_PAYLOAD"`, `message: "displayName max 32 chars"`. | PASS |
| **Invalid Color Format** | `wsHandler_joinRoom_invalidColor_verifiesExactErrorPayload` | `type: "ERROR"`, `code: "INVALID_PAYLOAD"`, `message: "color must be a hex color e.g. #6366F1"`. | PASS |
| **Max Capacity Limit** | `addParticipant_fails_atCapacity` | Enforces 12-participant cap; 13th user receives `code: "ROOM_FULL"`. | PASS |

### 2.2 `OBJECT_LOCK`
- **Handler**: `TesseraWebSocketHandler.handleObjectLock`

| Test Scenario | Method | Verified Payload Structure | Result |
|---|---|---|---|
| **Lock Acquisition** | `lockAcquisition_succeeds_onUnlocked` | Grants soft lock to requester; broadcasts `OBJECT_LOCK` with `elementId` and `lockedBy`. | PASS |
| **Lock Conflict** | `lockAcquisition_fails_onAlreadyLocked` | Rejects second requester; returns `code: "ELEMENT_LOCKED"`. | PASS |
| **Concurrent Lock Race** | `concurrentLockRace_exactlyOneWinner` | 10 concurrent threads attempt lock on same element simultaneously; **exactly 1 thread wins**, 9 fail. | PASS |
| **Non-Existent Element** | `wsHandler_lockNonExistentElement_verifiesExactErrorPayload` | `type: "ERROR"`, `code: "ELEMENT_NOT_FOUND"`. | PASS |
| **Disconnect Cleanup** | `wsHandler_disconnect_clearsLocksAndBroadcastsLeft` | Session closure automatically clears held locks and broadcasts `OBJECT_RELEASE`. | PASS |

### 2.3 `OBJECT_MOVE` & `OBJECT_RELEASE`
- **Handler**: `TesseraWebSocketHandler.handleObjectMove` / `handleObjectRelease`

| Test Scenario | Method | Verified Payload Structure | Result |
|---|---|---|---|
| **Move by Owner** | `moveElement_byLockOwner_updatesPosition` | Position updated in memory and broadcast to peers. | PASS |
| **Move without Lock** | `moveElement_byNonOwner_rejected` | Request ignored; non-lock holder cannot update coordinates. | PASS |
| **Unregistered Session** | `wsHandler_unregisteredSessionAction_ignoredGracefully` | Unregistered socket movement ignored without server crash or NPE. | PASS |
| **Coordinate Clamping** | `coordinateClamping_enforcedOnSetPosition` | Coordinates outside `[0.0, 1.0]` clamped to valid boundary range `[0.0, 1.0]`. | PASS |
| **Full Lifecycle Chain** | `elementLifecycle_stateTransitionChain` | `LOCK(C1) -> MOVE(C1) -> RELEASE(C1) -> LOCK(C2) -> MOVE(C2) -> RELEASE(C2)` verifying state persistence across transitions. | PASS |

### 2.4 `PING` & `SYNC_REQUEST` & Malformed Frames

| Test Scenario | Method | Verified Payload Structure | Result |
|---|---|---|---|
| **Ping / Pong RTT** | `wsHandler_ping_verifiesPongPayloadAndTimestamp` | `type: "PONG"`, `timestamp` matches client request. | PASS |
| **Sync Request** | `wsHandler_syncRequest_returnsRoomState` | `type: "ROOM_STATE"` with complete element and participant snapshot. | PASS |
| **4KB Payload Limit** | `wsHandler_payloadTooLarge_verifiesExactErrorPayload` | `type: "ERROR"`, `code: "PAYLOAD_TOO_LARGE"`, `message: "Message exceeds 4KB limit"`. | PASS |
| **Malformed Raw JSON** | `wsHandler_malformedJSON_verifiesStructuredErrorResponse` | Catch block handles Jackson `JsonParseException`; returns `type: "ERROR"`, `code: "INVALID_PAYLOAD"`. | PASS |

---

## 3. End-to-End Workflow Verification (`ACTION -> OBSERVED EFFECT -> REMOTE EFFECT -> PERSISTED EFFECT`)

1. **CTA Click & Navigation**: Client clicks `#create-room-btn` -> `POST /api/rooms` -> navigated to `/room/[id]` -> `.canvas-stage` & `.collab-dock` render.
2. **Multi-User Realtime Presence**: Client A & Client B join `/room/e2e-sync-room` -> dock displays 2 avatars on both context A and context B.
3. **Realtime Element Interaction & Persistence**: Client A drags element -> Client B receives WS broadcast -> Client B reloads page -> position persisted cleanly from state store.
