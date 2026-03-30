# SynapseRoute AI — Backend Architecture Implementation Plan

> **Goal:** Transform the existing Fastify scaffold (in-memory store, monolithic `index.ts`) into a secure, organized, production-grade microservices backend using **Better Auth**, **PostgreSQL**, **Prisma ORM**, **gRPC** (ConnectRPC), dual **GraphQL + REST API**, and **Docker** orchestration.

---

## Current State Assessment

The existing backend (`services/backend/`) is a single Fastify server with:
- **136-line monolith** (`src/index.ts`) — all routes in one file
- **In-memory Map** store (`src/modules/store.ts`) — no persistence
- **Zod schemas** for validation — can be preserved and extended
- **No authentication** — zero auth layer
- **No database** — no PostgreSQL, no ORM
- **HTTP-only** inter-service calls to `routing-ml` and `failure-predictor`
- **No GraphQL** — REST only
- **Docker Compose** exists but has no PostgreSQL service

---

## User Review Required

> [!IMPORTANT]
> **Technology Choices That Need Your Approval:**
> 1. **ConnectRPC over raw gRPC** — ConnectRPC is a modern gRPC-compatible framework that runs on standard HTTP and supports gRPC, gRPC-Web, and the Connect protocol simultaneously. It produces cleaner TypeScript, works with `curl` for debugging, and avoids the pain of raw `@grpc/grpc-js` proto-loader setup. It is fully wire-compatible with native gRPC clients. **Do you approve ConnectRPC, or do you strictly want raw `@grpc/grpc-js`?**
> 2. **Mercurius for GraphQL** — Since we're on Fastify, Mercurius is the official GraphQL adapter (JIT-compiled, tight integration). The alternative is GraphQL Yoga (framework-agnostic but slightly more overhead). **Mercurius recommended — approve?**
> 3. **Pothos for schema builder** — Code-first GraphQL schema builder with first-class Prisma integration (auto-generates CRUD types from your Prisma models). **Approve?**

> [!WARNING]
> **Breaking Changes:**
> - The existing `services/backend/` will be restructured into a modular architecture. The current `src/index.ts` monolith will be decomposed into service modules.
> - Docker Compose files will be rewritten to include PostgreSQL, the API Gateway, and gRPC service mesh.
> - The `shared/contracts/` JSON schemas will be replaced by `.proto` definitions and Prisma schema as the source of truth.

---

## Proposed Architecture

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        FE[Next.js Frontend]
    end

    subgraph Gateway["API Gateway — services/gateway"]
        REST[REST API — Fastify]
        GQL[GraphQL API — Mercurius]
        AUTH[Better Auth Middleware]
        REST --> AUTH
        GQL --> AUTH
    end

    subgraph Services["Core Services — gRPC / ConnectRPC"]
        ORDER[Order Service<br/>:50051]
        ROUTE[Route Service<br/>:50052]
        DRIVER[Driver Service<br/>:50053]
        ANALYTICS[Analytics Service<br/>:50054]
        NOTIFICATION[Notification Service<br/>:50055]
    end

    subgraph ML["ML Services — HTTP/JSON stays"]
        ROUTING_ML[Routing ML<br/>FastAPI :8000]
        FAILURE_PRED[Failure Predictor<br/>FastAPI :8001]
    end

    subgraph Realtime["Real-Time Layer"]
        SOCKETIO[Socket.IO Server<br/>:3002]
        REDIS_PS[Redis Pub/Sub]
    end

    subgraph Data["Data Layer — Docker"]
        PG[(PostgreSQL :5432)]
        REDIS[(Redis :6379)]
    end

    subgraph Observability["Observability"]
        OTEL[OpenTelemetry]
        PROM[Prometheus]
        GRAF[Grafana]
    end

    FE -->|REST + GraphQL + WS| Gateway
    AUTH -->|gRPC| Services
    ORDER --> PG
    ROUTE --> PG
    DRIVER --> PG
    ANALYTICS --> PG
    ROUTE -->|HTTP| ROUTING_ML
    ORDER -->|HTTP| FAILURE_PRED
    NOTIFICATION --> REDIS_PS
    REDIS_PS --> SOCKETIO
    SOCKETIO --> FE
    Services --> OTEL --> PROM --> GRAF
```

### Key Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| API Gateway pattern | Single Fastify gateway serving REST + GraphQL | Unified auth, rate limiting, logging at the edge. Services stay internal. |
| Inter-service comms | ConnectRPC (gRPC-compatible) | Type-safe `.proto` contracts, HTTP/2 multiplexing, debuggable with curl |
| Auth | Better Auth + Prisma adapter | TypeScript-first, session-based, plugin ecosystem (2FA, org, RBAC) |
| ORM | Prisma with PostgreSQL | Type-safe queries, declarative migrations, first-class TS support |
| GraphQL | Mercurius + Pothos | JIT-compiled, code-first schema, auto Prisma integration |
| DB per concern | Single PostgreSQL, schema separation | MVP simplicity; can split databases per service later |

---

## Proposed Changes

### Phase 1: Infrastructure Foundation (Docker + PostgreSQL)

> Docker services, database, and monorepo tooling.

---

#### [MODIFY] [docker-compose.dev.yml](file:///Users/meet/Developer/SynapseRoute/docker-compose.dev.yml)
- Add **PostgreSQL 16** service with health checks, persistent volume
- Add **pgAdmin** for dev database management
- Add **gateway** service (replacing current `backend` service)
- Add individual gRPC service containers for order, route, driver, analytics
- Update networking with dedicated `synapse-net` bridge network
- Add environment variables for `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`

#### [NEW] `.env.local.example`
```env
# Database
DATABASE_URL=postgresql://synapse:synapse_dev@localhost:5432/synapseroute_dev
SHADOW_DATABASE_URL=postgresql://synapse:synapse_dev@localhost:5432/synapseroute_shadow

# Auth
BETTER_AUTH_SECRET=<generate-with-openssl-rand-base64-32>
BETTER_AUTH_URL=http://localhost:3001

# Redis
REDIS_URL=redis://localhost:6379

# ML Services
ROUTING_ML_URL=http://localhost:8000
PREDICTOR_URL=http://localhost:8001

# gRPC
ORDER_SERVICE_URL=http://localhost:50051
ROUTE_SERVICE_URL=http://localhost:50052
DRIVER_SERVICE_URL=http://localhost:50053
ANALYTICS_SERVICE_URL=http://localhost:50054
```

---

### Phase 2: Prisma ORM + Database Schema

> Data modeling, migrations, and Prisma client setup.

---

#### [NEW] `services/gateway/prisma/schema.prisma`

Full Prisma schema covering all domain models from the PRD (§11) plus Better Auth tables:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ─── Better Auth Tables (auto-generated via CLI) ───
model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  emailVerified Boolean   @default(false)
  image         String?
  role          UserRole  @default(DISPATCHER)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  sessions      Session[]
  accounts       Account[]
  @@map("users")
}

model Session { ... }  // Better Auth managed
model Account { ... }  // Better Auth managed
model Verification { ... } // Better Auth managed

// ─── Domain Models ───
model Order {
  id              String        @id @default(uuid())
  recipientName   String
  rawAddress      String
  lat             Float?
  lng             Float?
  zoneId          String?
  locationType    LocationType
  timePreference  TimePreference
  scheduledTime   DateTime?
  status          OrderStatus   @default(PENDING)
  failureProb     Float?
  riskTier        RiskTier?
  assignedDriverId String?
  assignedDriver  Driver?       @relation(fields: [assignedDriverId], references: [id])
  eta             DateTime?
  createdAt       DateTime      @default(now())
  completedAt     DateTime?
  routeStops      RouteStop[]
  events          DeliveryEvent[]
  @@index([status])
  @@index([zoneId])
  @@index([assignedDriverId])
  @@map("orders")
}

model Driver {
  id              String       @id @default(uuid())
  name            String
  currentLat      Float?
  currentLng      Float?
  status          DriverStatus @default(IDLE)
  activeRouteId   String?
  totalDeliveries Int          @default(0)
  successRate     Float        @default(1.0)
  orders          Order[]
  routes          Route[]
  @@map("drivers")
}

model Route {
  id              String      @id @default(uuid())
  driverId        String
  driver          Driver      @relation(fields: [driverId], references: [id])
  depotLat        Float
  depotLng        Float
  totalDistanceKm Float?
  totalDurationMin Int?
  confidenceScore Float?
  status          RouteStatus @default(PLANNED)
  stops           RouteStop[]
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  @@index([driverId])
  @@map("routes")
}

model RouteStop {
  id        String         @id @default(uuid())
  routeId   String
  route     Route          @relation(fields: [routeId], references: [id])
  orderId   String
  order     Order          @relation(fields: [orderId], references: [id])
  sequence  Int
  eta       DateTime?
  arrivedAt DateTime?
  status    RouteStopStatus @default(PENDING)
  @@unique([routeId, sequence])
  @@map("route_stops")
}

model DeliveryEvent {
  id        String        @id @default(uuid())
  orderId   String
  order     Order         @relation(fields: [orderId], references: [id])
  eventType EventType
  timestamp DateTime      @default(now())
  payload   Json?
  @@index([orderId])
  @@index([eventType])
  @@map("delivery_events")
}

model Zone {
  id          String  @id
  name        String
  failureRate Float   @default(0.05)
  centerLat   Float
  centerLng   Float
  @@map("zones")
}

// ─── Enums ───
enum UserRole      { ADMIN DISPATCHER VIEWER }
enum LocationType  { RESIDENTIAL COMMERCIAL }
enum TimePreference { ASAP SCHEDULED }
enum OrderStatus   { PENDING ASSIGNED IN_TRANSIT DELIVERED FAILED }
enum DriverStatus  { IDLE ON_ROUTE BREAK }
enum RouteStatus   { PLANNED ACTIVE COMPLETED }
enum RouteStopStatus { PENDING COMPLETED FAILED SKIPPED }
enum RiskTier      { LOW MEDIUM HIGH }
enum EventType     { RISK_FLAGGED REROUTED DELIVERED FAILED DELAYED }
```

#### [NEW] `services/gateway/prisma/seed.ts`
- Seed zones (Chennai districts with synthetic failure rates)
- Seed 2-3 demo drivers
- Seed demo orders for development

---

### Phase 3: Better Auth Integration

> Authentication, session management, role-based access control.

---

#### [NEW] `services/gateway/src/lib/auth.ts`
```typescript
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma.js";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,     // refresh daily
  },
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "DISPATCHER" },
    },
  },
});
```

#### [NEW] `services/gateway/src/plugins/auth.plugin.ts`
- Fastify plugin that mounts Better Auth handler on `/api/auth/*`
- Decorates Fastify request with `session` and `user`
- Provides `requireAuth` and `requireRole(role)` preHandler hooks

#### [NEW] `services/gateway/src/middleware/guards.ts`
- `requireAuth` — rejects 401 if no valid session
- `requireRole("ADMIN")` — rejects 403 if insufficient role
- `requireOwnership` — resource-level ownership checks

---

### Phase 4: API Gateway (REST + GraphQL)

> Unified edge service serving both REST and GraphQL, forwarding to internal gRPC services.

---

#### [NEW] `services/gateway/` — Full directory structure:
```
services/gateway/
├── Dockerfile
├── Dockerfile.dev
├── package.json
├── tsconfig.json
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── src/
│   ├── index.ts              # Fastify app bootstrap
│   ├── lib/
│   │   ├── auth.ts           # Better Auth instance
│   │   ├── prisma.ts         # PrismaClient singleton
│   │   └── grpc-clients.ts   # ConnectRPC client pool
│   ├── plugins/
│   │   ├── auth.plugin.ts    # Auth route mounting
│   │   ├── graphql.plugin.ts # Mercurius + Pothos
│   │   ├── cors.plugin.ts
│   │   └── rate-limit.plugin.ts
│   ├── routes/               # REST API routes
│   │   ├── orders.route.ts
│   │   ├── drivers.route.ts
│   │   ├── routes.route.ts
│   │   ├── predict.route.ts
│   │   ├── analytics.route.ts
│   │   ├── geocode.route.ts
│   │   ├── simulate.route.ts
│   │   └── health.route.ts
│   ├── graphql/              # GraphQL schema
│   │   ├── builder.ts        # Pothos SchemaBuilder
│   │   ├── types/
│   │   │   ├── order.type.ts
│   │   │   ├── driver.type.ts
│   │   │   ├── route.type.ts
│   │   │   └── analytics.type.ts
│   │   ├── queries/
│   │   │   ├── order.query.ts
│   │   │   ├── driver.query.ts
│   │   │   └── analytics.query.ts
│   │   └── mutations/
│   │       ├── order.mutation.ts
│   │       ├── route.mutation.ts
│   │       └── driver.mutation.ts
│   ├── middleware/
│   │   └── guards.ts
│   └── utils/
│       ├── errors.ts
│       └── logger.ts
```

#### Key REST Endpoints (preserved from PRD §10):

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/*` | Public | Better Auth catch-all (login, register, OAuth) |
| `POST` | `/api/orders` | `requireAuth` | Create delivery order |
| `GET` | `/api/orders` | `requireAuth` | List orders (paginated, filtered) |
| `GET` | `/api/orders/:id` | `requireAuth` | Get single order |
| `POST` | `/api/geocode` | `requireAuth` | Geocode address |
| `POST` | `/api/predict` | `requireAuth` | Get failure prediction |
| `POST` | `/api/route/optimize` | `requireRole(ADMIN)` | Batch route optimization |
| `POST` | `/api/route/reroute` | `requireAuth` | Trigger re-optimization |
| `GET` | `/api/track` | `requireAuth` | Get driver positions |
| `GET` | `/api/simulate/tick` | `requireRole(ADMIN)` | Advance simulation |
| `GET` | `/api/analytics/summary` | `requireAuth` | Dashboard stats |
| `GET` | `/api/health` | Public | System health check |
| `POST` | `/graphql` | `requireAuth` | GraphQL endpoint |

#### GraphQL Features:
- **Queries**: `orders`, `order(id)`, `drivers`, `driver(id)`, `routes`, `analyticsSummary`
- **Mutations**: `createOrder`, `updateOrderStatus`, `optimizeRoutes`, `triggerReroute`
- **Subscriptions** (via Mercurius + Redis): `orderStatusChanged`, `driverPositionUpdated`
- **Prisma integration via Pothos**: Auto-generated types, relay-style pagination, filtering

---

### Phase 5: gRPC Service Mesh (ConnectRPC)

> Internal service-to-service communication via type-safe proto contracts.

---

#### [NEW] `shared/proto/` — Protocol Buffer definitions:
```
shared/proto/
├── buf.gen.yaml              # Buf codegen config
├── buf.yaml                  # Buf module config
├── synapseroute/
│   └── v1/
│       ├── order.proto
│       ├── driver.proto
│       ├── route.proto
│       ├── analytics.proto
│       └── common.proto
```

#### Example: `order.proto`
```protobuf
syntax = "proto3";
package synapseroute.v1;

service OrderService {
  rpc CreateOrder(CreateOrderRequest) returns (CreateOrderResponse);
  rpc GetOrder(GetOrderRequest) returns (Order);
  rpc ListOrders(ListOrdersRequest) returns (ListOrdersResponse);
  rpc UpdateOrderStatus(UpdateOrderStatusRequest) returns (Order);
  rpc GetOrdersByDriver(GetOrdersByDriverRequest) returns (ListOrdersResponse);
}

message Order {
  string id = 1;
  string recipient_name = 2;
  string raw_address = 3;
  double lat = 4;
  double lng = 5;
  string zone_id = 6;
  LocationType location_type = 7;
  OrderStatus status = 8;
  double failure_prob = 9;
  RiskTier risk_tier = 10;
  string assigned_driver_id = 11;
  google.protobuf.Timestamp eta = 12;
  google.protobuf.Timestamp created_at = 13;
}

// ... enums, request/response messages
```

#### [NEW] `services/order-service/` — Standalone gRPC microservice:
```
services/order-service/
├── Dockerfile
├── Dockerfile.dev
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts           # ConnectRPC server bootstrap
│   ├── handlers/
│   │   └── order.handler.ts  # Service implementation
│   ├── lib/
│   │   └── prisma.ts      # PrismaClient (shared DB)
│   └── utils/
│       └── errors.ts
```

#### [NEW] `services/route-service/` — Route optimization gRPC service
- Handles route CRUD, calls `routing-ml` (FastAPI) over HTTP for ML optimization
- Owns route-stop management and re-optimization logic

#### [NEW] `services/driver-service/` — Driver management gRPC service
- Driver CRUD, position tracking, load balancing calculations

#### [NEW] `services/analytics-service/` — Analytics gRPC service
- Aggregates delivery outcomes, computes KPIs
- Zone failure rate calculations

---

### Phase 6: Real-Time Layer

> Socket.IO + Redis Pub/Sub for live driver tracking and notifications.

---

#### [MODIFY] `services/gateway/src/index.ts`
- Integrate `@fastify/socket.io` for WebSocket support on the gateway
- Subscribe to Redis Pub/Sub channels for driver position updates and notification events

#### [NEW] `services/gateway/src/plugins/realtime.plugin.ts`
- Socket.IO namespace `/tracking` for driver positions
- Socket.IO namespace `/notifications` for alerts
- Auth middleware on socket connection (validate Better Auth session)

---

### Phase 7: Observability

> Structured logging, distributed tracing, health checks.

---

#### [NEW] `services/gateway/src/plugins/telemetry.plugin.ts`
- OpenTelemetry SDK initialization
- Trace propagation across gRPC calls using ConnectRPC interceptors
- Fastify request/response instrumentation

#### [MODIFY] `ops/prometheus/prometheus.yml`
- Add scrape targets for gateway and all gRPC services
- Add recording rules for key SLIs

---

### Phase 8: Docker Orchestration

> Complete Docker Compose rewrite for the full microservice stack.

---

#### [MODIFY] [docker-compose.dev.yml](file:///Users/meet/Developer/SynapseRoute/docker-compose.dev.yml)

Final dev compose with all services:

| Service | Image/Build | Port | Purpose |
|---------|------------|------|---------|
| `postgres` | `postgres:16-alpine` | 5432 | Primary database |
| `redis` | `redis:7-alpine` | 6379 | Pub/Sub + caching |
| `gateway` | `./services/gateway` | 3001 | REST + GraphQL + Auth |
| `order-service` | `./services/order-service` | 50051 | Order gRPC |
| `route-service` | `./services/route-service` | 50052 | Route gRPC |
| `driver-service` | `./services/driver-service` | 50053 | Driver gRPC |
| `analytics-service` | `./services/analytics-service` | 50054 | Analytics gRPC |
| `routing-ml` | `./services/routing-ml` | 8000 | ML route optimization |
| `failure-predictor` | `./services/failure-predictor` | 8001 | ML failure prediction |
| `prometheus` | `prom/prometheus` | 9090 | Metrics collection |
| `grafana` | `grafana/grafana` | 3002 | Dashboards |

---

## Open Questions

> [!IMPORTANT]
> **1. ConnectRPC vs raw gRPC?**
> ConnectRPC is strongly recommended (cleaner TS, curl-debuggable, full gRPC wire compatibility). Raw `@grpc/grpc-js` is possible but more boilerplate. **Your preference?**

> [!IMPORTANT]
> **2. Database strategy: single DB with schema isolation, or database-per-service?**
> For MVP, a single PostgreSQL with all tables is simpler. For strict microservice boundaries, each service gets its own database. **Single DB recommended for now — approve?**

> [!IMPORTANT]
> **3. Monorepo tooling: Turborepo?**
> With 5+ TypeScript services sharing protos, types, and configs, a monorepo tool like Turborepo would manage builds, linting, and dependency caching efficiently. The current setup has no monorepo tooling. **Add it?**

> [!IMPORTANT]
> **4. Session storage: Database or Redis?**
> Better Auth defaults to database sessions (PostgreSQL). Redis sessions are faster for high-traffic but add operational complexity. **Database sessions recommended for MVP — approve?**

> [!IMPORTANT]
> **5. What about the old `services/backend/` directory?**
> It will be replaced by `services/gateway/` (the new API gateway). The old code will be migrated and the directory removed. **Approve?**

---

## Verification Plan

### Automated Tests
1. **Unit tests** for each gRPC service handler using Vitest
2. **Integration tests** for REST + GraphQL endpoints using `fastify.inject()`
3. **Auth flow tests** — register, login, session validation, role-based access
4. **Database migration tests** — `prisma migrate deploy` on fresh DB
5. **Proto contract tests** — Buf lint + breaking change detection

### Manual Verification
1. `docker compose up` boots all services with health checks
2. Register user → Login → Create order → Predict → Optimize → Track flow via REST
3. Same flow via GraphQL using the embedded GraphiQL IDE
4. Verify gRPC inter-service calls via gateway logs
5. Check Grafana dashboards for service metrics

### Commands
```bash
# Boot infrastructure
docker compose -f docker-compose.dev.yml up -d postgres redis

# Run migrations
cd services/gateway && npx prisma migrate deploy && npx prisma db seed

# Boot all services
docker compose -f docker-compose.dev.yml up

# Run tests
npm run test --workspaces

# Proto linting
cd shared/proto && npx buf lint
```
