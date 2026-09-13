# Tessera Backend Deployment Discovery

## 1. Project Specifications
- **Backend Path**: `tessera-backend`
- **Build Command**: `mvn clean package -DskipTests=false`
- **Test Command**: `mvn test`
- **Local Run Command**: `mvn spring-boot:run`
- **Production Run Command**: `java -jar target/tessera-backend-1.0.0.jar`
- **Java Version**: `17` (Target JDK 17 / OpenJDK 17+)
- **Spring Boot Version**: `3.2.3`

## 2. API & Real-Time Protocol Specifications
### Exposed REST Endpoints
- `GET /api/health`: Health status, active room count, system timestamp
- `POST /api/rooms`: Creates a new collaborative room, returns `{ "roomId": "<uuid>" }`
- `GET /api/rooms/{roomId}`: Fetches metadata for an existing room

### WebSocket Protocol Endpoint
- `ws://<host>/ws` / `wss://<host>/ws`: Real-time multiplayer synchronization channel

### Supported Real-Time Message Types
- `JOIN_ROOM`: Participant association
- `CURSOR_MOVE`: Ephemeral position relay (~60fps throttled)
- `OBJECT_LOCK`: Atomic drag lease request
- `OBJECT_MOVE`: Position updates during active lock
- `OBJECT_RELEASE`: Position commit & lock release
- `PING` / `PONG`: Round-trip latency probe
- `SYNC_REQUEST`: Full room state resynchronization request

## 3. Environment Variables
- `PORT`: Dynamic server port supplied by hosting environment (default fallback: `8080`)
- `tessera.cors.allowed-origins`: Configured CORS origin pattern (default fallback: `*`)

## 4. Architecture & Dependencies
- **State Model**: Ephemeral in-memory concurrency & room management (`RoomManager`, `Room`).
- **External Dependencies**: None (Self-contained Spring Boot Web + WebSocket architecture).
- **Deployment Assumptions**: Single-node instance (ephemeral room state maintained in RAM).
