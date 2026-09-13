package com.tessera;

import com.tessera.room.Room;
import com.tessera.room.RoomManager;
import com.tessera.state.CanvasElement;
import com.tessera.state.ElementType;
import com.tessera.presence.Participant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.web.socket.WebSocketSession;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class TesseraBackendTests {

    private Room room;
    private RoomManager roomManager;

    @BeforeEach
    void setUp() {
        room = new Room("test-room-id");
        roomManager = new RoomManager();
    }

    // ── Room creation ─────────────────────────────────────────────────────────

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

    // ── Participant management ─────────────────────────────────────────────────

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

    // ── Lock management ────────────────────────────────────────────────────────

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

    // ── Object movement ────────────────────────────────────────────────────────

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

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String firstElementId() {
        return room.getElements().iterator().next().getId();
    }

    private Participant mockParticipant(String wsId, String clientId, String name, String color) {
        WebSocketSession session = Mockito.mock(WebSocketSession.class);
        Mockito.when(session.getId()).thenReturn(wsId);
        Mockito.when(session.isOpen()).thenReturn(true);
        return new Participant(clientId, name, color, session);
    }
}
