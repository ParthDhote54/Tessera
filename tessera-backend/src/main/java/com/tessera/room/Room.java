package com.tessera.room;

import com.tessera.presence.Participant;
import com.tessera.state.CanvasElement;
import com.tessera.state.ElementType;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * An in-memory collaborative room.
 * <p>
 * Thread-safety contract: all operations that check-then-act on locks
 * are executed inside synchronized(this) blocks. Cursor broadcasts are
 * fire-and-forget and need no synchronization on room state.
 */
public class Room {

    public static final int MAX_PARTICIPANTS = 12;

    private final String roomId;
    private final Instant createdAt;
    private volatile Instant lastActivityAt;

    /** wsSessionId → Participant */
    private final Map<String, Participant> participantsByWsId = new ConcurrentHashMap<>();
    /** clientSessionId → Participant */
    private final Map<String, Participant> participantsByClientId = new ConcurrentHashMap<>();
    /** elementId → CanvasElement */
    private final Map<String, CanvasElement> elements = new LinkedHashMap<>();
    /** elementId → clientSessionId of lock holder */
    private final Map<String, String> locks = new ConcurrentHashMap<>();

    public Room(String roomId) {
        this.roomId = roomId;
        this.createdAt = Instant.now();
        this.lastActivityAt = Instant.now();
        seedElements();
    }

    // ── Seeded scene ─────────────────────────────────────────────────────────

    private void seedElements() {
        addElement(new CanvasElement(ElementType.PRODUCT, "Hero Product",  0.08, 0.12, 0.24, 0.32));
        addElement(new CanvasElement(ElementType.HOTSPOT, "AR Anchor",     0.42, 0.10, 0.09, 0.09));
        addElement(new CanvasElement(ElementType.CTA,     "Shop Now",      0.54, 0.20, 0.22, 0.11));
        addElement(new CanvasElement(ElementType.OFFER,   "20% Off Today", 0.08, 0.62, 0.27, 0.11));
        addElement(new CanvasElement(ElementType.POLL,    "Quick Poll",    0.54, 0.54, 0.30, 0.22));
    }

    private void addElement(CanvasElement el) {
        elements.put(el.getId(), el);
    }

    // ── Participant management ────────────────────────────────────────────────

    public synchronized boolean addParticipant(String wsSessionId, Participant p) {
        if (participantsByWsId.size() >= MAX_PARTICIPANTS) return false;
        participantsByWsId.put(wsSessionId, p);
        participantsByClientId.put(p.getSessionId(), p);
        touch();
        return true;
    }

    public synchronized Participant removeParticipant(String wsSessionId) {
        Participant p = participantsByWsId.remove(wsSessionId);
        if (p != null) {
            participantsByClientId.remove(p.getSessionId());
            touch();
        }
        return p;
    }

    // ── Lock management (must be atomic) ─────────────────────────────────────

    /**
     * Attempts to grant a lock on elementId to clientSessionId.
     * Returns true on success, false if element does not exist or is already locked.
     */
    public synchronized boolean tryAcquireLock(String elementId, String clientSessionId) {
        if (!elements.containsKey(elementId)) return false;
        if (locks.containsKey(elementId)) return false;
        locks.put(elementId, clientSessionId);
        touch();
        return true;
    }

    /**
     * Releases a lock, but only if the current holder is clientSessionId.
     * Returns the element on success, null otherwise.
     */
    public synchronized CanvasElement releaseLock(String elementId, String clientSessionId) {
        String holder = locks.get(elementId);
        if (holder == null || !holder.equals(clientSessionId)) return null;
        locks.remove(elementId);
        touch();
        return elements.get(elementId);
    }

    /**
     * Releases ALL locks held by a client (used on disconnect).
     * Returns list of element IDs that were released.
     */
    public synchronized List<String> releaseAllLocks(String clientSessionId) {
        List<String> released = new ArrayList<>();
        locks.entrySet().removeIf(e -> {
            if (e.getValue().equals(clientSessionId)) {
                released.add(e.getKey());
                return true;
            }
            return false;
        });
        return released;
    }

    /**
     * Validates that clientSessionId owns the lock on elementId, then
     * updates the element's position. Returns element on success, null otherwise.
     */
    public synchronized CanvasElement moveElement(String elementId, String clientSessionId, double x, double y) {
        String holder = locks.get(elementId);
        if (holder == null || !holder.equals(clientSessionId)) return null;
        CanvasElement el = elements.get(elementId);
        if (el == null) return null;
        el.setPosition(x, y);
        touch();
        return el;
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    public boolean isParticipant(String wsSessionId) {
        return participantsByWsId.containsKey(wsSessionId);
    }

    public Participant getByWsSession(String wsSessionId) {
        return participantsByWsId.get(wsSessionId);
    }

    public Collection<Participant> getParticipants() {
        return participantsByWsId.values();
    }

    public CanvasElement getElement(String elementId) {
        return elements.get(elementId);
    }

    public Collection<CanvasElement> getElements() {
        return elements.values();
    }

    public String getLockHolder(String elementId) {
        return locks.get(elementId);
    }

    public Map<String, String> getLocks() {
        return Collections.unmodifiableMap(locks);
    }

    public boolean isEmpty() {
        return participantsByWsId.isEmpty();
    }

    public String getRoomId() { return roomId; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getLastActivityAt() { return lastActivityAt; }
    private void touch() { this.lastActivityAt = Instant.now(); }
}
