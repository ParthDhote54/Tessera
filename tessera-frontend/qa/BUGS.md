# Tessera Defect Log

## Defect Inventory & Remediation

### DEF-001 (P1 - Critical): Non-existent Direct Room Links Threw `ROOM_NOT_FOUND` Error
- **Severity**: P1 (Critical)
- **Area**: Backend (`RoomManager.java` & `TesseraWebSocketHandler.java`)
- **Reproduction**: Opening a direct URL like `/room/demo-room` when the server restarted threw an error screen.
- **Root Cause**: `RoomManager.getRoom(id)` only looked up pre-existing room IDs without on-demand seeding for demo routes.
- **Fix**: Updated `RoomManager.getRoom(id)` to execute `rooms.putIfAbsent(roomId, new Room(roomId))` on demand.
- **Regression Test**: `TesseraBackendTests.roomManager_getRoom_autoCreatesIfAbsent`.
- **Status**: **RESOLVED & VERIFIED**

### DEF-002 (P2 - Significant): Canvas Blur on High-DPI (Retina/Mobile) Displays
- **Severity**: P2 (Significant)
- **Area**: Frontend Canvas Stage (`CanvasStage.tsx` & `useCanvasRenderer.ts`)
- **Reproduction**: Inspecting rendered text and 1px borders on high-DPI displays revealed blurry canvas backing buffer scaling.
- **Root Cause**: Canvas backing width/height were set to CSS pixel bounds without multiplying by `window.devicePixelRatio`.
- **Fix**: Updated `ResizeObserver` in `CanvasStage.tsx` to set `canvas.width = rectWidth * dpr` and `ctx.scale(dpr, dpr)` in frame loop.
- **Regression Test**: Playwright screenshot inspection across high-DPI viewports.
- **Status**: **RESOLVED & VERIFIED**

### DEF-003 (P2 - Significant): Package Visibility Blocking Test Invocation
- **Severity**: P2 (Significant)
- **Area**: Backend Test Suite (`TesseraWebSocketHandler.java`)
- **Reproduction**: Maven unit test failed compilation when invoking `handleTextMessage`.
- **Root Cause**: Method visibility was `protected` in Spring's `TextWebSocketHandler`.
- **Fix**: Made `handleTextMessage` `public` in `TesseraWebSocketHandler.java`.
- **Regression Test**: `TesseraBackendTests.wsHandler_joinRoom_validPayload_sendsStateAndBroadcasts`.
- **Status**: **RESOLVED & VERIFIED**
