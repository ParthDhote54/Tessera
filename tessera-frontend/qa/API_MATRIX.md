# Tessera Backend API & WebSocket Test Matrix

| Endpoint | Method / Type | Auth / Payload Req | Valid Input | Invalid Input | Expected Success | Expected Error | Test Status |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| `/api/rooms` | POST | None | Empty body | N/A | 200 OK `{"roomId": "..."}` | 500 Internal | **PASS** |
| `/api/rooms/{id}` | GET | None | Valid `roomId` | Nonexistent `roomId` | 200 OK metadata | 404 Not Found | **PASS** |
| `/api/health` | GET | None | None | N/A | 200 OK `{"status":"ok"}` | 500 Internal | **PASS** |
| `/ws` (`JOIN_ROOM`) | WS | JSON Payload | `roomId`, `sessionId`, `displayName`, `color` | Missing fields / invalid color format | `ROOM_STATE` & `USER_JOINED` broadcast | `INVALID_PAYLOAD` | **PASS** |
| `/ws` (`CURSOR_MOVE`)| WS | JSON Payload | `x: 0.5, y: 0.5` | Out-of-bounds `x: 1.5, y: -0.2` | Clamped `CURSOR_MOVE` broadcast | Ignored / Clamped | **PASS** |
| `/ws` (`OBJECT_LOCK`) | WS | JSON Payload | Valid `elementId` | Already locked `elementId` / invalid ID | `OBJECT_LOCK` broadcast | `ELEMENT_LOCKED` error | **PASS** |
| `/ws` (`OBJECT_MOVE`) | WS | JSON Payload | `elementId`, `x`, `y` (Lock holder) | Non-lock holder attempt | `OBJECT_MOVE` broadcast | Silent drop | **PASS** |
| `/ws` (`OBJECT_RELEASE`)| WS | JSON Payload| `elementId`, `x`, `y` (Lock holder) | Non-lock holder attempt | `OBJECT_RELEASE` broadcast | Silent drop | **PASS** |
| `/ws` (`PING`) | WS | JSON Payload | `timestamp` | Null timestamp | `PONG` response | Fallback timestamp | **PASS** |
| `/ws` (`SYNC_REQUEST`)| WS | JSON Payload | None | N/A | `ROOM_STATE` response | Silent drop | **PASS** |
