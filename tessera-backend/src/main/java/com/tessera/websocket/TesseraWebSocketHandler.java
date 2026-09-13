package com.tessera.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tessera.presence.Participant;
import com.tessera.protocol.InboundMessage;
import com.tessera.protocol.MessageType;
import com.tessera.protocol.OutboundMessage;
import com.tessera.room.Room;
import com.tessera.room.RoomManager;
import com.tessera.state.CanvasElement;
import com.tessera.sync.SynchronizationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.*;

/**
 * Core WebSocket message handler for Tessera.
 * Routes all incoming frames to the appropriate handler method.
 */
@Component
public class TesseraWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(TesseraWebSocketHandler.class);
    private static final int MAX_PAYLOAD_BYTES = 4 * 1024; // 4KB

    private final ObjectMapper objectMapper;
    private final RoomManager roomManager;
    private final SynchronizationService sync;

    /** wsSessionId → roomId (for cleanup on disconnect) */
    private final Map<String, String> sessionToRoom = new java.util.concurrent.ConcurrentHashMap<>();

    public TesseraWebSocketHandler(ObjectMapper objectMapper,
                                   RoomManager roomManager,
                                   SynchronizationService sync) {
        this.objectMapper = objectMapper;
        this.roomManager = roomManager;
        this.sync = sync;
    }

    // ── Connection lifecycle ──────────────────────────────────────────────────

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        log.info("WS connected: {}", session.getId());
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        log.info("WS closed: {} status={}", session.getId(), status);
        handleDisconnect(session);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        log.warn("WS transport error: {} err={}", session.getId(), exception.getMessage());
        handleDisconnect(session);
    }

    // ── Message routing ───────────────────────────────────────────────────────

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        if (message.getPayloadLength() > MAX_PAYLOAD_BYTES) {
            sync.sendTo(session, OutboundMessage.error("PAYLOAD_TOO_LARGE", "Message exceeds 4KB limit"));
            return;
        }
        try {
            InboundMessage msg = objectMapper.readValue(message.getPayload(), InboundMessage.class);
            if (msg.getType() == null) {
                sync.sendTo(session, OutboundMessage.error("MISSING_TYPE", "Message type is required"));
                return;
            }

            MessageType type;
            try {
                type = MessageType.valueOf(msg.getType());
            } catch (IllegalArgumentException e) {
                // Unknown message type — silently ignore
                return;
            }

            switch (type) {
                case JOIN_ROOM      -> handleJoinRoom(session, msg);
                case CURSOR_MOVE    -> handleCursorMove(session, msg);
                case OBJECT_LOCK    -> handleObjectLock(session, msg);
                case OBJECT_MOVE    -> handleObjectMove(session, msg);
                case OBJECT_RELEASE -> handleObjectRelease(session, msg);
                case PING           -> handlePing(session, msg);
                case SYNC_REQUEST   -> handleSyncRequest(session);
                default             -> {} // Server→Client types; ignore if received
            }
        } catch (Exception e) {
            log.warn("Error processing WS message from {}: {}", session.getId(), e.getMessage());
            try {
                sync.sendTo(session, OutboundMessage.error("INVALID_PAYLOAD", "Could not process message"));
            } catch (Exception ignored) {}
        }
    }

    // ── Handlers ──────────────────────────────────────────────────────────────

    private void handleJoinRoom(WebSocketSession session, InboundMessage msg) {
        String roomId      = msg.getString("roomId");
        String clientSid   = msg.getString("sessionId");
        String displayName = msg.getString("displayName");
        String color       = msg.getString("color");

        // Validate required fields
        if (isBlank(roomId) || isBlank(clientSid) || isBlank(displayName) || isBlank(color)) {
            sync.sendTo(session, OutboundMessage.error("INVALID_PAYLOAD", "roomId, sessionId, displayName, color required"));
            return;
        }
        if (displayName.length() > 32) {
            sync.sendTo(session, OutboundMessage.error("INVALID_PAYLOAD", "displayName max 32 chars"));
            return;
        }
        if (!color.matches("^#[0-9a-fA-F]{6}$")) {
            sync.sendTo(session, OutboundMessage.error("INVALID_PAYLOAD", "color must be a hex color e.g. #6366F1"));
            return;
        }

        Optional<Room> roomOpt = roomManager.getRoom(roomId);
        if (roomOpt.isEmpty()) {
            sync.sendTo(session, OutboundMessage.error("ROOM_NOT_FOUND", "Room not found or has expired"));
            return;
        }

        Room room = roomOpt.get();
        Participant participant = new Participant(clientSid, displayName, color, session);

        if (!room.addParticipant(session.getId(), participant)) {
            sync.sendTo(session, OutboundMessage.error("ROOM_FULL", "Room has reached maximum capacity"));
            return;
        }

        sessionToRoom.put(session.getId(), roomId);
        log.info("Participant {} ({}) joined room {}", displayName, clientSid, roomId);

        // Send full room state to joiner
        sync.sendTo(session, buildRoomState(room));

        // Broadcast USER_JOINED to others
        OutboundMessage joined = new OutboundMessage(MessageType.USER_JOINED)
                .put("sessionId", clientSid)
                .put("displayName", displayName)
                .put("color", color);
        sync.broadcastToOthers(room, session.getId(), joined);
    }

    private void handleCursorMove(WebSocketSession session, InboundMessage msg) {
        Room room = requireJoinedRoom(session);
        if (room == null) return;

        Participant p = room.getByWsSession(session.getId());
        Double x = msg.getDouble("x");
        Double y = msg.getDouble("y");
        if (x == null || y == null) return;

        OutboundMessage cursor = new OutboundMessage(MessageType.CURSOR_MOVE)
                .put("sessionId", p.getSessionId())
                .put("x", clamp(x))
                .put("y", clamp(y));
        sync.broadcastToOthers(room, session.getId(), cursor);
    }

    private void handleObjectLock(WebSocketSession session, InboundMessage msg) {
        Room room = requireJoinedRoom(session);
        if (room == null) return;

        Participant p = room.getByWsSession(session.getId());
        String elementId = msg.getString("elementId");
        if (isBlank(elementId)) {
            sync.sendTo(session, OutboundMessage.error("INVALID_PAYLOAD", "elementId required"));
            return;
        }
        if (room.getElement(elementId) == null) {
            sync.sendTo(session, OutboundMessage.error("ELEMENT_NOT_FOUND", "Element does not exist"));
            return;
        }

        boolean granted = room.tryAcquireLock(elementId, p.getSessionId());
        if (!granted) {
            String holder = room.getLockHolder(elementId);
            sync.sendTo(session, OutboundMessage.error("ELEMENT_LOCKED",
                    "Element is locked by " + (holder != null ? holder : "another user")));
            return;
        }

        OutboundMessage lockMsg = new OutboundMessage(MessageType.OBJECT_LOCK)
                .put("elementId", elementId)
                .put("lockedBy", p.getSessionId());
        sync.broadcastToRoom(room, lockMsg);
    }

    private void handleObjectMove(WebSocketSession session, InboundMessage msg) {
        Room room = requireJoinedRoom(session);
        if (room == null) return;

        Participant p = room.getByWsSession(session.getId());
        String elementId = msg.getString("elementId");
        Double x = msg.getDouble("x");
        Double y = msg.getDouble("y");

        if (isBlank(elementId) || x == null || y == null) return;

        CanvasElement el = room.moveElement(elementId, p.getSessionId(), x, y);
        if (el == null) return; // Not lock holder or element doesn't exist

        OutboundMessage moveMsg = new OutboundMessage(MessageType.OBJECT_MOVE)
                .put("elementId", elementId)
                .put("x", el.getX())
                .put("y", el.getY());
        sync.broadcastToOthers(room, session.getId(), moveMsg);
    }

    private void handleObjectRelease(WebSocketSession session, InboundMessage msg) {
        Room room = requireJoinedRoom(session);
        if (room == null) return;

        Participant p = room.getByWsSession(session.getId());
        String elementId = msg.getString("elementId");
        Double x = msg.getDouble("x");
        Double y = msg.getDouble("y");
        if (isBlank(elementId)) return;

        // Apply final position if provided before releasing
        if (x != null && y != null) {
            room.moveElement(elementId, p.getSessionId(), x, y);
        }

        CanvasElement el = room.releaseLock(elementId, p.getSessionId());
        if (el == null) return;

        OutboundMessage releaseMsg = new OutboundMessage(MessageType.OBJECT_RELEASE)
                .put("elementId", elementId)
                .put("x", el.getX())
                .put("y", el.getY());
        sync.broadcastToRoom(room, releaseMsg);
    }

    private void handlePing(WebSocketSession session, InboundMessage msg) {
        Long ts = msg.getLong("timestamp");
        sync.sendTo(session, OutboundMessage.pong(ts != null ? ts : System.currentTimeMillis()));
    }

    private void handleSyncRequest(WebSocketSession session) {
        Room room = requireJoinedRoom(session);
        if (room == null) return;
        sync.sendTo(session, buildRoomState(room));
    }

    // ── Disconnect cleanup ─────────────────────────────────────────────────────

    private void handleDisconnect(WebSocketSession session) {
        String wsSessionId = session.getId();
        String roomId = sessionToRoom.remove(wsSessionId);
        if (roomId == null) return;

        Optional<Room> roomOpt = roomManager.getRoom(roomId);
        if (roomOpt.isEmpty()) return;

        Room room = roomOpt.get();
        Participant p = room.removeParticipant(wsSessionId);
        if (p == null) return;

        // Release all locks held by this participant
        List<String> releasedElementIds = room.releaseAllLocks(p.getSessionId());
        for (String elementId : releasedElementIds) {
            CanvasElement el = room.getElement(elementId);
            if (el != null) {
                OutboundMessage releaseMsg = new OutboundMessage(MessageType.OBJECT_RELEASE)
                        .put("elementId", elementId)
                        .put("x", el.getX())
                        .put("y", el.getY());
                sync.broadcastToRoom(room, releaseMsg);
            }
        }

        // Broadcast USER_LEFT
        OutboundMessage leftMsg = new OutboundMessage(MessageType.USER_LEFT)
                .put("sessionId", p.getSessionId());
        sync.broadcastToRoom(room, leftMsg);

        log.info("Participant {} left room {}", p.getDisplayName(), roomId);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Room requireJoinedRoom(WebSocketSession session) {
        String roomId = sessionToRoom.get(session.getId());
        if (roomId == null) return null;
        return roomManager.getRoom(roomId).orElse(null);
    }

    private OutboundMessage buildRoomState(Room room) {
        List<Map<String, Object>> participantList = new ArrayList<>();
        for (Participant p : room.getParticipants()) {
            participantList.add(p.toMap());
        }

        List<Map<String, Object>> elementList = new ArrayList<>();
        for (CanvasElement el : room.getElements()) {
            elementList.add(el.toMap(room.getLockHolder(el.getId())));
        }

        return new OutboundMessage(MessageType.ROOM_STATE)
                .put("roomId", room.getRoomId())
                .put("participants", participantList)
                .put("elements", elementList);
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private static double clamp(double v) {
        return Math.max(0.0, Math.min(1.0, v));
    }
}
