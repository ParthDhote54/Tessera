# Tessera Backend Deployment & Infrastructure Report (Canonical Dockerfile Consolidation)

## 1. Executive Summary & Infrastructure Cleanup
- **REJECTED URL**: `https://personal-finance-api.onrender.com` is an existing Personal Finance Manager backend service and **MUST NOT** be used or certified as Tessera infrastructure.
- **CANONICAL DOCKERFILE CONSOLIDATION**:
  - **Structure**: Consolidated to single canonical [tessera-backend/Dockerfile](file:///p:/Java%20backend%20Projects/flam-ai-tessera/tessera-backend/Dockerfile) matching Render's `rootDir: tessera-backend` and `dockerfilePath: Dockerfile` configuration in [render.yaml](file:///p:/Java%20backend%20Projects/flam-ai-tessera/render.yaml).
  - **Local Validation**: Canonical `docker build -t tessera-backend .` executed in `tessera-backend/` -> **BUILD SUCCESS**.
  - **Test Validation**: `mvn test` executed in `tessera-backend/` -> 29 JUnit 5 tests run, 0 failures, 0 errors (**BUILD SUCCESS**).
- **CERTIFICATION STATUS**: **NOT CERTIFIED** (Pending live Render Web Service deployment for Tessera under a dedicated Render URL).

---

## 2. Infrastructure & Containerization Architecture

### Source & Repository Identity
- **Local Path**: `P:\Java backend Projects\flam-ai-tessera\tessera-backend`
- **Git Repository**: `https://github.com/ParthDhote54/Tessera.git` (Branch: `main`, Commit: `1a67c02`)

### Production Docker Architecture ([tessera-backend/Dockerfile](file:///p:/Java%20backend%20Projects/flam-ai-tessera/tessera-backend/Dockerfile))
- **Build Stage**: `maven:3.9.6-eclipse-temurin-17-alpine`
- **Runtime Stage**: `eclipse-temurin:17-jre-alpine` (Minimal JRE runtime image)
- **Security**: Non-root system user (`tessera`) created and configured to execute container artifact.
- **Port Exposure**: Dynamic `${PORT}` binding.

### Render Blueprint Manifest (`render.yaml`)
```yaml
services:
  - type: web
    name: tessera-backend
    env: docker
    rootDir: tessera-backend
    dockerfilePath: Dockerfile
    plan: free
    region: oregon
    envVars:
      - key: PORT
        value: 10000
      - key: tessera.cors.allowed-origins
        value: "https://personal-finance-manager-frontends.vercel.app"
    healthCheckPath: /api/health
```

---

## 3. Strict Production CORS Hardening
Wildcard CORS origins (`*`) have been completely eliminated from production configuration.

- **REST API CORS**: Configured via `WebMvcCorsConfig.java` to explicitly allow `https://personal-finance-manager-frontends.vercel.app`.
- **WebSocket CORS**: Configured in `WebSocketConfig.java` to restrict handshake origins to `https://personal-finance-manager-frontends.vercel.app`.
- **Properties Override**: `tessera.cors.allowed-origins` configured in `application.properties`.

---

## 4. Required API & WebSocket Protocol Specifications

### REST Endpoints
| Endpoint | Method | Expected Output | Purpose |
|---|---|---|---|
| `/api/health` | GET | `{"status":"ok","rooms":0,"timestamp":...}` | System health & room count from `RoomManager` |
| `/api/rooms` | POST | `{"roomId":"<uuid>"}` | Room instantiation |
| `/api/rooms/{id}` | GET | `{"roomId":"...","participantCount":1,"createdAt":"..."}` | Room state lookup |

### WebSocket Endpoint
- **URL**: `wss://<TESSERA-RENDER-URL>/ws`
- **Supported Messages**: `JOIN_ROOM`, `CURSOR_MOVE`, `OBJECT_LOCK`, `OBJECT_MOVE`, `OBJECT_RELEASE`, `PING`/`PONG`, `SYNC_REQUEST`.

---

## 5. Verification Gate Status

| Certification Gate | Target | Status | Reason / Evidence |
|---|---|---|---|
| **Local Unit & Integration Tests** | JDK 17 | **PASS** | 29 JUnit 5 tests run, 0 failures, 0 errors |
| **Strict Production CORS** | Source Code | **PASS** | Restricted to `https://personal-finance-manager-frontends.vercel.app` |
| **Canonical Docker Build** | Docker Engine | **PASS** | `docker build -t tessera-backend .` in `tessera-backend/` -> BUILD SUCCESS |
| **Render Blueprint Spec** | Git Repo | **PASS** | Single canonical Dockerfile and `render.yaml` committed & pushed (`1a67c02`) |
| **Dedicated Render Web Service** | Render Cloud | **UNVERIFIED** | Service `tessera-backend` awaiting trigger on Render dashboard |
| **Production REST Endpoints** | Live URL | **UNVERIFIED** | Awaiting dedicated Render deployment |
| **Production WebSocket Handshake** | Live WSS URL | **UNVERIFIED** | Awaiting dedicated Render deployment |
| **Two-Client Realtime Sync** | Live WSS URL | **UNVERIFIED** | Awaiting dedicated Render deployment |
| **Vercel → Render E2E Sync** | Live App | **UNVERIFIED** | Awaiting dedicated Render deployment |

---

## 6. Final Certification Verdict

**FINAL STATUS**: **NOT CERTIFIED**

*Reason: The local codebase, unit tests, CORS hardening, canonical Docker build, and `render.yaml` configuration are 100% complete and pushed to GitHub (`1a67c02`). However, a live Render Web Service for Tessera has not yet been provisioned/triggered on Render. Per strict certification rules, optimism or reusing an external service (`personal-finance-api.onrender.com`) is explicitly forbidden.*
