# Tessera Regression Test Suite Log

## Automated Regression Test Coverage

1. `TesseraBackendTests.java`:
   - `roomCreation_seedsElements`
   - `roomCreation_hasExpectedElementTypes`
   - `roomManager_createRoom_returnsUniqueId`
   - `roomManager_getRoom_autoCreatesIfAbsent` (DEF-001 regression)
   - `addParticipant_succeeds_underCapacity`
   - `addParticipant_fails_atCapacity`
   - `removeParticipant_returnsParticipant`
   - `lockAcquisition_succeeds_onUnlocked`
   - `lockAcquisition_fails_onAlreadyLocked`
   - `lockRelease_byOwner_succeeds`
   - `lockRelease_byNonOwner_fails`
   - `releaseAllLocks_onDisconnect`
   - `moveElement_byLockOwner_updatesPosition`
   - `moveElement_byNonOwner_rejected`
   - `coordinateClamping_enforcedOnSetPosition`
   - `roomController_createRoom_returnsOkWithRoomId`
   - `roomController_getRoom_returnsMetadata`
   - `roomController_health_returnsStatusOk`
   - `wsHandler_joinRoom_invalidColor_sendsError`
   - `wsHandler_joinRoom_validPayload_sendsStateAndBroadcasts` (DEF-003 regression)
   - `wsHandler_disconnect_clearsLocksAndBroadcastsLeft`

2. `qa-e2e-realtime.js`:
   - Multi-user simultaneous browser session connection.
   - Dual-client cursor tracking and presence dock counter synchronization.

3. `qa-room-capture.js`:
   - Multi-viewport visual regression capture (`desktop-1440`, `desktop-1280`, `tablet-768`, `mobile-390`, `mobile-375`).
