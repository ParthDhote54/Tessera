package com.tessera.protocol;

/**
 * All WebSocket message types used in the Tessera protocol.
 */
public enum MessageType {
    // Client → Server
    JOIN_ROOM,
    CURSOR_MOVE,
    OBJECT_LOCK,
    OBJECT_MOVE,
    OBJECT_RELEASE,
    PING,
    SYNC_REQUEST,

    // Server → Client
    ROOM_STATE,
    USER_JOINED,
    USER_LEFT,
    PONG,
    ERROR
}
