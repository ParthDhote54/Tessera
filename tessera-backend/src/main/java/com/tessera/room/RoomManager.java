package com.tessera.room;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Manages the lifecycle of all in-memory rooms.
 */
@Component
public class RoomManager {

    private static final Logger log = LoggerFactory.getLogger(RoomManager.class);
    private static final Duration INACTIVE_TTL = Duration.ofMinutes(10);

    private final ConcurrentHashMap<String, Room> rooms = new ConcurrentHashMap<>();

    public String createRoom() {
        String roomId = UUID.randomUUID().toString();
        rooms.put(roomId, new Room(roomId));
        log.info("Room created: {}", roomId);
        return roomId;
    }

    public Optional<Room> getRoom(String roomId) {
        if (roomId != null && !rooms.containsKey(roomId)) {
            rooms.putIfAbsent(roomId, new Room(roomId));
        }
        return Optional.ofNullable(rooms.get(roomId));
    }

    public boolean roomExists(String roomId) {
        return rooms.containsKey(roomId);
    }

    public void removeRoom(String roomId) {
        rooms.remove(roomId);
        log.info("Room removed: {}", roomId);
    }

    @Scheduled(fixedDelay = 5 * 60 * 1000) // every 5 minutes
    public void cleanupInactiveRooms() {
        Instant threshold = Instant.now().minus(INACTIVE_TTL);
        int before = rooms.size();
        rooms.entrySet().removeIf(entry -> {
            Room room = entry.getValue();
            boolean stale = room.isEmpty() && room.getLastActivityAt().isBefore(threshold);
            if (stale) log.info("Cleaning up inactive room: {}", entry.getKey());
            return stale;
        });
        int removed = before - rooms.size();
        if (removed > 0) log.info("Cleaned up {} inactive rooms", removed);
    }

    public int getRoomCount() { return rooms.size(); }
}
