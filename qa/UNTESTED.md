# Untested Inventory & Architectural Scope Boundaries

This document provides a transparent inventory of functionality that is currently outside the implementation scope of the Tessera MVP architecture or for which automated test evidence does not exist.

---

## 1. Architectural Scope Boundaries (Not Implemented by Design)

| Feature Area | Architectural Reality | Reason for Absence in Test Suite |
|---|---|---|
| **SQL / Relational Persistence** | Tessera currently uses an in-memory thread-safe `ConcurrentHashMap` state store (`RoomStore.java`). | No SQL database or ORM migrations are configured. Database invariant tests map to in-memory state store atomicity. |
| **OAuth2 / JWT Identity Provider** | Rooms are accessible via public guest URLs. | No centralized authentication server or password hashing module exists; user IDs are generated on client connection. |
| **WebRTC Audio/Video Streams** | Spatial audio/video mesh is out of scope for the core canvas engine. | Realtime interaction relies strictly on WebSocket message broadcasting (`/ws/canvas`). |
| **Infinite Canvas Spatial Index (R-Tree / QuadTree)** | Canvas rendering currently iterates over an in-memory map of 2D element nodes. | Spatial spatial partition algorithms (e.g. QuadTree spatial queries for 100,000+ nodes) are not yet implemented. |
| **Persistent Undo/Redo Event Sourcing Log** | State mutations update live element records directly. | Event sourcing log replay is not persisted to disk across application restarts. |

---

## 2. Tested Features with Operational Limitations

| Feature Area | Current Test Coverage | Limitation / Gap |
|---|---|---|
| **Multi-Node Clustering (Redis Pub/Sub)** | Tested on single Spring Boot server instance with 12 concurrent WS sockets. | Multi-node WebSocket message fanout via Redis/NATS is not tested in cluster mode. |
| **Network Latency & Jitter** | Tested on localhost with sub-10ms latency. | Playwright network throttling tests (3G / 200ms ping simulation) were not executed. |
| **Touch Gesture Multi-touch Pinch/Zoom** | Pointer/Mouse events verified across 5 desktop/mobile viewports. | Native multi-touch gesture events (pinch to zoom) rely on mouse wheel fallbacks in automated E2E. |

---

## 3. Recommended Future Test Enhancements

1. Add **K6 / Locust load testing script** to benchmark 500+ concurrent WebSocket connections across 50 simultaneous rooms.
2. Introduce **PostgreSQL + Flyway schema migrations** if persistent user accounts and saved room archives are added.
3. Integrate **Playwright Network Throttling** into CI pipeline to verify delta compression under 3G network latency.
