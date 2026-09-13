package com.tessera.sync;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tessera.presence.Participant;
import com.tessera.protocol.OutboundMessage;
import com.tessera.room.Room;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.Collection;

/**
 * Handles broadcasting messages to room participants.
 */
@Service
public class SynchronizationService {

    private static final Logger log = LoggerFactory.getLogger(SynchronizationService.class);
    private final ObjectMapper objectMapper;

    public SynchronizationService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /** Send a message to a single WebSocket session. */
    public void sendTo(WebSocketSession session, OutboundMessage msg) {
        send(session, msg);
    }

    /** Broadcast to all participants in a room. */
    public void broadcastToRoom(Room room, OutboundMessage msg) {
        broadcast(room.getParticipants(), null, msg);
    }

    /** Broadcast to all participants EXCEPT the one with the given wsSessionId. */
    public void broadcastToOthers(Room room, String excludeWsSessionId, OutboundMessage msg) {
        broadcast(room.getParticipants(), excludeWsSessionId, msg);
    }

    private void broadcast(Collection<Participant> participants, String excludeWsSessionId, OutboundMessage msg) {
        for (Participant p : participants) {
            if (excludeWsSessionId != null && p.getWsSession().getId().equals(excludeWsSessionId)) continue;
            send(p.getWsSession(), msg);
        }
    }

    private void send(WebSocketSession session, OutboundMessage msg) {
        if (!session.isOpen()) return;
        try {
            String json = objectMapper.writeValueAsString(msg.getPayload());
            synchronized (session) {
                session.sendMessage(new TextMessage(json));
            }
        } catch (IOException e) {
            log.warn("Failed to send message to session {}: {}", session.getId(), e.getMessage());
        }
    }
}
