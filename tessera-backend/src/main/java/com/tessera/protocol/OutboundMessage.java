package com.tessera.protocol;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.HashMap;
import java.util.Map;

/**
 * Generic outbound message builder. Builds a type-tagged JSON object
 * for sending to WebSocket clients.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class OutboundMessage {

    private final Map<String, Object> payload = new HashMap<>();

    public OutboundMessage(MessageType type) {
        payload.put("type", type.name());
    }

    public OutboundMessage put(String key, Object value) {
        payload.put(key, value);
        return this;
    }

    public Map<String, Object> getPayload() {
        return payload;
    }

    // ── Convenience factories ────────────────────────────────────────────────

    public static OutboundMessage error(String code, String message) {
        return new OutboundMessage(MessageType.ERROR)
                .put("code", code)
                .put("message", message);
    }

    public static OutboundMessage pong(long timestamp) {
        return new OutboundMessage(MessageType.PONG)
                .put("timestamp", timestamp);
    }
}
