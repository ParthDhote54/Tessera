package com.tessera;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tessera.controller.RoomController;
import com.tessera.presence.Participant;
import com.tessera.protocol.OutboundMessage;
import com.tessera.room.Room;
import com.tessera.room.RoomManager;
import com.tessera.state.CanvasElement;
import com.tessera.state.ElementType;
import com.tessera.sync.SynchronizationService;
import com.tessera.websocket.TesseraWebSocketHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class TesseraBackendTests {

    private Room room;
    private RoomManager roomManager;
    private ObjectMapper objectMapper;
    private SynchronizationService syncService;
    private TesseraWebSocketHandler wsHandler;

    @BeforeEach
    void setUp() {
        room = new Room("test-room-id");
        roomManager = new RoomManager();
        objectMapper = new ObjectMapper();
        syncService = Mockito.spy(new SynchronizationService(objectMapper));
        wsHandler = new TesseraWebSocketHandler(objectMapper, roomManager, syncService);
    }

    // ── Room Creation & Seed Validation ──────────────────────────────────────

    @Test
    void roomCreation_seedsElements() {
        assertFalse(room.getElements().isEmpty(), "Seeded elements should exist");
        assertEquals(5, room.getElements().size(), "Should have 5 seeded elements");
    }

    @Test
    void roomCreation_hasExpectedElementTypes() {
        var types = room.getElements().stream()
                .map(CanvasElement::getType)
                .toList();
        assertTrue(types.contains(ElementType.PRODUCT));
        assertTrue(types.contains(ElementType.HOTSPOT));
        assertTrue(types.contains(ElementType.CTA));
        assertTrue(types.contains(ElementType.OFFER));
        assertTrue(types.contains(ElementType.POLL));
    }

    @Test
    void roomManager_createRoom_returnsUniqueId() {
        String id1 = roomManager.createRoom();
        String id2 = roomManager.createRoom();
        assertNotEquals(id1, id2);
        assertTrue(roomManager.roomExists(id1));
        assertTrue(roomManager.roomExists(id2));
    }

    @Test
    void roomManager_getRoom_autoCreatesIfAbsent() {
        var optRoom = roomManager.getRoom("demo-room");
        assertTrue(optRoom.isPresent());
        assertEquals("demo-room", optRoom.get().getRoomId());
    }

    // ── Participant Management ────────────────────────────────────────────────

    @Test
    void addParticipant_succeeds_underCapacity() {
        Participant p = mockParticipant("ws-1", "client-1", "Alice", "#6366F1");
        boolean added = room.addParticipant("ws-1", p);
        assertTrue(added);
        assertEquals(1, room.getParticipants().size());
    }

    @Test
    void addParticipant_fails_atCapacity() {
        for (int i = 0; i < Room.MAX_PARTICIPANTS; i++) {
            room.addParticipant("ws-" + i, mockParticipant("ws-" + i, "c-" + i, "User" + i, "#6366F1"));
        }
        boolean extra = room.addParticipant("ws-overflow", mockParticipant("ws-overflow", "c-overflow", "Extra", "#6366F1"));
        assertFalse(extra, "Should reject participant at capacity");
    }

    @Test
    void removeParticipant_returnsParticipant() {
        Participant p = mockParticipant("ws-1", "client-1", "Alice", "#6366F1");
        room.addParticipant("ws-1", p);
        Participant removed = room.removeParticipant("ws-1");
        assertNotNull(removed);
        assertEquals("Alice", removed.getDisplayName());
        assertEquals(0, room.getParticipants().size());
    }

    // ── Lock Management & Concurrency ─────────────────────────────────────────

    @Test
    void lockAcquisition_succeeds_onUnlocked() {
        String elementId = firstElementId();
        boolean granted = room.tryAcquireLock(elementId, "client-1");
        assertTrue(granted);
        assertEquals("client-1", room.getLockHolder(elementId));
    }

    @Test
    void lockAcquisition_fails_onAlreadyLocked() {
        String elementId = firstElementId();
        room.tryAcquireLock(elementId, "client-1");
        boolean secondGrant = room.tryAcquireLock(elementId, "client-2");
        assertFalse(secondGrant, "Should not grant lock to second requester");
        assertEquals("client-1", room.getLockHolder(elementId));
    }

    @Test
    void lockRelease_byOwner_succeeds() {
        String elementId = firstElementId();
        room.tryAcquireLock(elementId, "client-1");
        CanvasElement released = room.releaseLock(elementId, "client-1");
        assertNotNull(released);
        assertNull(room.getLockHolder(elementId));
    }

    @Test
    void lockRelease_byNonOwner_fails() {
        String elementId = firstElementId();
        room.tryAcquireLock(elementId, "client-1");
        CanvasElement released = room.releaseLock(elementId, "client-2");
        assertNull(released, "Non-owner should not be able to release lock");
        assertEquals("client-1", room.getLockHolder(elementId));
    }

    @Test
    void releaseAllLocks_onDisconnect() {
        List<String> elementIds = room.getElements().stream().map(CanvasElement::getId).limit(2).toList();
        room.tryAcquireLock(elementIds.get(0), "client-1");
        room.tryAcquireLock(elementIds.get(1), "client-1");

        List<String> released = room.releaseAllLocks("client-1");
        assertEquals(2, released.size());
        assertNull(room.getLockHolder(elementIds.get(0)));
        assertNull(room.getLockHolder(elementIds.get(1)));
    }

    @Test
    void concurrentLockRace_exactlyOneWinner() throws Exception {
        String elementId = firstElementId();
        int threads = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch latch = new CountDownLatch(1);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        for (int i = 0; i < threads; i++) {
            final String clientId = "client-thread-" + i;
            executor.submit(() -> {
                try {
                    latch.await();
                    if (room.tryAcquireLock(elementId, clientId)) {
                        successCount.incrementAndGet();
                    } else {
                        failureCount.incrementAndGet();
                    }
                } catch (InterruptedException ignored) {}
            });
        }

        latch.countDown();
        executor.shutdown();
        executor.awaitTermination(3, java.util.concurrent.TimeUnit.SECONDS);

        assertEquals(1, successCount.get(), "Exactly one client must acquire the lock under race");
        assertEquals(threads - 1, failureCount.get(), "All other clients must be rejected");
        assertNotNull(room.getLockHolder(elementId));
    }

    // ── Full State Transition Lifecycle ──────────────────────────────────────

    @Test
    void elementLifecycle_stateTransitionChain() {
        String elementId = firstElementId();

        // 1. Client 1 acquires lock
        assertTrue(room.tryAcquireLock(elementId, "c1"));
        assertEquals("c1", room.getLockHolder(elementId));

        // 2. Client 1 moves element to (0.3, 0.4)
        CanvasElement move1 = room.moveElement(elementId, "c1", 0.3, 0.4);
        assertNotNull(move1);
        assertEquals(0.3, move1.getX(), 0.001);
        assertEquals(0.4, move1.getY(), 0.001);

        // 3. Client 1 releases lock
        assertNotNull(room.releaseLock(elementId, "c1"));
        assertNull(room.getLockHolder(elementId));

        // 4. Client 2 acquires lock & updates to (0.7, 0.8)
        assertTrue(room.tryAcquireLock(elementId, "c2"));
        assertEquals("c2", room.getLockHolder(elementId));
        CanvasElement move2 = room.moveElement(elementId, "c2", 0.7, 0.8);
        assertNotNull(move2);
        assertEquals(0.7, move2.getX(), 0.001);

        // 5. Client 2 releases lock -> position remains persistent at (0.7, 0.8)
        assertNotNull(room.releaseLock(elementId, "c2"));
        CanvasElement finalEl = room.getElement(elementId);
        assertEquals(0.7, finalEl.getX(), 0.001);
        assertEquals(0.8, finalEl.getY(), 0.001);
        assertNull(room.getLockHolder(elementId));
    }

    // ── Object Movement & Clamping ───────────────────────────────────────────

    @Test
    void moveElement_byLockOwner_updatesPosition() {
        String elementId = firstElementId();
        room.tryAcquireLock(elementId, "client-1");
        CanvasElement el = room.moveElement(elementId, "client-1", 0.5, 0.5);
        assertNotNull(el);
        assertEquals(0.5, el.getX(), 0.001);
        assertEquals(0.5, el.getY(), 0.001);
    }

    @Test
    void moveElement_byNonOwner_rejected() {
        String elementId = firstElementId();
        room.tryAcquireLock(elementId, "client-1");
        CanvasElement el = room.moveElement(elementId, "client-2", 0.9, 0.9);
        assertNull(el, "Non-owner should not be able to move element");
    }

    @Test
    void coordinateClamping_enforcedOnSetPosition() {
        String elementId = firstElementId();
        room.tryAcquireLock(elementId, "client-1");
        CanvasElement el = room.moveElement(elementId, "client-1", 1.5, -0.3);
        assertNotNull(el);
        assertEquals(1.0, el.getX(), 0.001, "X should be clamped to 1.0");
        assertEquals(0.0, el.getY(), 0.001, "Y should be clamped to 0.0");
    }

    // ── REST Controller Endpoint Tests ────────────────────────────────────────

    @Test
    void roomController_createRoom_returnsOkWithRoomId() {
        RoomController controller = new RoomController(roomManager);
        ResponseEntity<Map<String, String>> response = controller.createRoom();
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().containsKey("roomId"));
    }

    @Test
    void roomController_getRoom_returnsMetadata() {
        String roomId = roomManager.createRoom();
        RoomController controller = new RoomController(roomManager);
        ResponseEntity<Map<String, Object>> response = controller.getRoom(roomId);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(roomId, response.getBody().get("roomId"));
    }

    @Test
    void roomController_health_returnsStatusOk() {
        RoomController controller = new RoomController(roomManager);
        ResponseEntity<Map<String, Object>> response = controller.health();
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("ok", response.getBody().get("status"));
    }

    // ── Deep WebSocket Protocol & Deep Payload Assertion Tests ───────────────

    @Test
    void wsHandler_payloadTooLarge_verifiesExactErrorPayload() throws Exception {
        WebSocketSession session = mockSession("ws-large-payload");
        StringBuilder sb = new StringBuilder("{\"type\":\"JOIN_ROOM\",\"large\":\"");
        for (int i = 0; i < 4100; i++) sb.append("A");
        sb.append("\"}");

        wsHandler.handleTextMessage(session, new TextMessage(sb.toString()));

        ArgumentCaptor<OutboundMessage> captor = ArgumentCaptor.forClass(OutboundMessage.class);
        verify(syncService, times(1)).sendTo(eq(session), captor.capture());

        OutboundMessage msg = captor.getValue();
        assertEquals("ERROR", msg.getPayload().get("type"));
        assertEquals("PAYLOAD_TOO_LARGE", msg.getPayload().get("code"));
        assertEquals("Message exceeds 4KB limit", msg.getPayload().get("message"));
    }

    @Test
    void wsHandler_displayNameTooLong_verifiesExactErrorPayload() throws Exception {
        WebSocketSession session = mockSession("ws-long-name");
        String payload = """
            {
                "type": "JOIN_ROOM",
                "roomId": "test-room-id",
                "sessionId": "client-1",
                "displayName": "ThisDisplayNameIsWayTooLongForRoomRegistrationLimit",
                "color": "#6366F1"
            }
            """;

        wsHandler.handleTextMessage(session, new TextMessage(payload));

        ArgumentCaptor<OutboundMessage> captor = ArgumentCaptor.forClass(OutboundMessage.class);
        verify(syncService, times(1)).sendTo(eq(session), captor.capture());

        OutboundMessage msg = captor.getValue();
        assertEquals("ERROR", msg.getPayload().get("type"));
        assertEquals("INVALID_PAYLOAD", msg.getPayload().get("code"));
        assertEquals("displayName max 32 chars", msg.getPayload().get("message"));
    }

    @Test
    void wsHandler_joinRoom_invalidColor_verifiesExactErrorPayload() throws Exception {
        WebSocketSession session = mockSession("ws-invalid-color");
        String payload = """
            {
                "type": "JOIN_ROOM",
                "roomId": "test-room-id",
                "sessionId": "client-1",
                "displayName": "Bob",
                "color": "not-a-color"
            }
            """;

        wsHandler.handleTextMessage(session, new TextMessage(payload));

        ArgumentCaptor<OutboundMessage> captor = ArgumentCaptor.forClass(OutboundMessage.class);
        verify(syncService, times(1)).sendTo(eq(session), captor.capture());

        OutboundMessage msg = captor.getValue();
        assertEquals("ERROR", msg.getPayload().get("type"));
        assertEquals("INVALID_PAYLOAD", msg.getPayload().get("code"));
        assertTrue(((String) msg.getPayload().get("message")).contains("hex color"));
    }

    @Test
    void wsHandler_joinRoom_validPayload_sendsStateAndBroadcasts() throws Exception {
        WebSocketSession session = mockSession("ws-valid-join");
        String payload = """
            {
                "type": "JOIN_ROOM",
                "roomId": "test-room-id",
                "sessionId": "client-join-1",
                "displayName": "Alice",
                "color": "#6366F1"
            }
            """;

        wsHandler.handleTextMessage(session, new TextMessage(payload));

        ArgumentCaptor<OutboundMessage> captor = ArgumentCaptor.forClass(OutboundMessage.class);
        verify(syncService, times(1)).sendTo(eq(session), captor.capture());
        OutboundMessage stateMsg = captor.getValue();
        assertEquals("ROOM_STATE", stateMsg.getPayload().get("type"));
        assertEquals("test-room-id", stateMsg.getPayload().get("roomId"));

        ArgumentCaptor<OutboundMessage> broadcastCaptor = ArgumentCaptor.forClass(OutboundMessage.class);
        verify(syncService, times(1)).broadcastToOthers(any(), eq("ws-valid-join"), broadcastCaptor.capture());
        assertEquals("USER_JOINED", broadcastCaptor.getValue().getPayload().get("type"));
    }

    @Test
    void wsHandler_lockNonExistentElement_verifiesExactErrorPayload() throws Exception {
        WebSocketSession session = mockSession("ws-lock-nonexistent");
        String joinPayload = """
            {
                "type": "JOIN_ROOM",
                "roomId": "test-room-id",
                "sessionId": "client-lock-1",
                "displayName": "Dave",
                "color": "#F59E0B"
            }
            """;
        wsHandler.handleTextMessage(session, new TextMessage(joinPayload));

        String lockPayload = """
            {
                "type": "OBJECT_LOCK",
                "elementId": "non-existent-fake-id"
            }
            """;
        wsHandler.handleTextMessage(session, new TextMessage(lockPayload));

        ArgumentCaptor<OutboundMessage> captor = ArgumentCaptor.forClass(OutboundMessage.class);
        verify(syncService, times(2)).sendTo(eq(session), captor.capture());

        OutboundMessage errorMsg = captor.getAllValues().get(1);
        assertEquals("ERROR", errorMsg.getPayload().get("type"));
        assertEquals("ELEMENT_NOT_FOUND", errorMsg.getPayload().get("code"));
    }

    @Test
    void wsHandler_ping_verifiesPongPayloadAndTimestamp() throws Exception {
        WebSocketSession session = mockSession("ws-ping");
        long ts = 1700000000000L;
        String pingPayload = "{\"type\":\"PING\",\"timestamp\":" + ts + "}";

        wsHandler.handleTextMessage(session, new TextMessage(pingPayload));

        ArgumentCaptor<OutboundMessage> captor = ArgumentCaptor.forClass(OutboundMessage.class);
        verify(syncService, times(1)).sendTo(eq(session), captor.capture());

        OutboundMessage pongMsg = captor.getValue();
        assertEquals("PONG", pongMsg.getPayload().get("type"));
        assertEquals(ts, pongMsg.getPayload().get("timestamp"));
    }

    @Test
    void wsHandler_malformedJSON_verifiesStructuredErrorResponse() throws Exception {
        WebSocketSession session = mockSession("ws-malformed-json");
        String badJson = "{ \"type\": \"JOIN_ROOM\", bad json format }";

        wsHandler.handleTextMessage(session, new TextMessage(badJson));

        ArgumentCaptor<OutboundMessage> captor = ArgumentCaptor.forClass(OutboundMessage.class);
        verify(syncService, times(1)).sendTo(eq(session), captor.capture());

        OutboundMessage errorMsg = captor.getValue();
        assertEquals("ERROR", errorMsg.getPayload().get("type"));
        assertEquals("INVALID_PAYLOAD", errorMsg.getPayload().get("code"));
    }

    @Test
    void wsHandler_unregisteredSessionAction_ignoredGracefully() throws Exception {
        WebSocketSession session = mockSession("ws-unregistered");
        // Try to move object without sending JOIN_ROOM first
        String movePayload = """
            {
                "type": "OBJECT_MOVE",
                "elementId": "elem-1",
                "x": 0.5,
                "y": 0.5
            }
            """;

        assertDoesNotThrow(() -> wsHandler.handleTextMessage(session, new TextMessage(movePayload)));
        // Should ignore without sending broadcast
        verify(syncService, never()).broadcastToOthers(any(), any(), any());
    }

    @Test
    void wsHandler_disconnect_clearsLocksAndBroadcastsLeft() throws Exception {
        WebSocketSession session = mockSession("ws-disc-1");
        String joinPayload = """
            {
                "type": "JOIN_ROOM",
                "roomId": "test-room-id",
                "sessionId": "client-disc-1",
                "displayName": "Charlie",
                "color": "#10B981"
            }
            """;
        wsHandler.handleTextMessage(session, new TextMessage(joinPayload));

        String elementId = firstElementId();
        String lockPayload = String.format("""
            {
                "type": "OBJECT_LOCK",
                "elementId": "%s"
            }
            """, elementId);
        wsHandler.handleTextMessage(session, new TextMessage(lockPayload));

        // Now disconnect
        wsHandler.afterConnectionClosed(session, CloseStatus.NORMAL);
        assertNull(roomManager.getRoom("test-room-id").get().getLockHolder(elementId));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String firstElementId() {
        return room.getElements().iterator().next().getId();
    }

    private WebSocketSession mockSession(String id) throws IOException {
        WebSocketSession session = Mockito.mock(WebSocketSession.class);
        Mockito.when(session.getId()).thenReturn(id);
        Mockito.when(session.isOpen()).thenReturn(true);
        return session;
    }

    private Participant mockParticipant(String wsId, String clientId, String name, String color) {
        try {
            WebSocketSession session = mockSession(wsId);
            return new Participant(clientId, name, color, session);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }
}
