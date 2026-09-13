package com.tessera.presence;

import org.springframework.web.socket.WebSocketSession;

import java.time.Instant;
import java.util.Map;

/**
 * Represents a connected participant in a Tessera room.
 */
public class Participant {

    private final String sessionId;
    private final String displayName;
    private final String color;
    private final WebSocketSession wsSession;
    private volatile Instant lastSeenAt;

    public Participant(String sessionId, String displayName, String color, WebSocketSession wsSession) {
        this.sessionId = sessionId;
        this.displayName = displayName;
        this.color = color;
        this.wsSession = wsSession;
        this.lastSeenAt = Instant.now();
    }

    public String getSessionId() { return sessionId; }
    public String getDisplayName() { return displayName; }
    public String getColor() { return color; }
    public WebSocketSession getWsSession() { return wsSession; }
    public Instant getLastSeenAt() { return lastSeenAt; }
    public void touch() { this.lastSeenAt = Instant.now(); }

    public Map<String, Object> toMap() {
        return Map.of(
                "sessionId", sessionId,
                "displayName", displayName,
                "color", color
        );
    }
}
