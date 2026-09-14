package com.tessera.controller;

import com.tessera.room.RoomManager;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class RoomController {

    private final RoomManager roomManager;

    public RoomController(RoomManager roomManager) {
        this.roomManager = roomManager;
    }

    @PostMapping("/rooms")
    public ResponseEntity<Map<String, String>> createRoom() {
        String roomId = roomManager.createRoom();
        return ResponseEntity.ok(Map.of("roomId", roomId));
    }

    @GetMapping("/rooms/{roomId}")
    public ResponseEntity<Map<String, Object>> getRoom(@PathVariable String roomId) {
        return roomManager.getRoom(roomId)
                .map(room -> ResponseEntity.ok(Map.<String, Object>of(
                        "roomId", room.getRoomId(),
                        "participantCount", room.getParticipants().size(),
                        "createdAt", room.getCreatedAt().toString()
                )))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "ok",
                "version", "1.0.2-cors-filter-fixed",
                "rooms", roomManager.getRoomCount(),
                "timestamp", System.currentTimeMillis()
        ));
    }
}
