-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'DISPATCHER', 'VIEWER');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('RESIDENTIAL', 'COMMERCIAL');

-- CreateEnum
CREATE TYPE "TimePreference" AS ENUM ('ASAP', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('IDLE', 'ON_ROUTE', 'BREAK');

-- CreateEnum
CREATE TYPE "RouteStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RouteStopStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "RiskTier" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('RISK_FLAGGED', 'REROUTED', 'DELIVERED', 'FAILED', 'DELAYED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'DISPATCHER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "idToken" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "recipient_name" TEXT NOT NULL,
    "raw_address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "zone_id" TEXT,
    "location_type" "LocationType" NOT NULL DEFAULT 'RESIDENTIAL',
    "time_preference" "TimePreference" NOT NULL DEFAULT 'ASAP',
    "scheduled_time" TIMESTAMP(3),
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "failure_prob" DOUBLE PRECISION,
    "risk_tier" "RiskTier",
    "assigned_driver_id" UUID,
    "eta" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "current_lat" DOUBLE PRECISION,
    "current_lng" DOUBLE PRECISION,
    "status" "DriverStatus" NOT NULL DEFAULT 'IDLE',
    "active_route_id" UUID,
    "total_deliveries" INTEGER NOT NULL DEFAULT 0,
    "success_rate" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routes" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "depot_lat" DOUBLE PRECISION NOT NULL,
    "depot_lng" DOUBLE PRECISION NOT NULL,
    "total_distance_km" DOUBLE PRECISION,
    "total_duration_min" INTEGER,
    "confidence_score" DOUBLE PRECISION,
    "status" "RouteStatus" NOT NULL DEFAULT 'PLANNED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_stops" (
    "id" UUID NOT NULL,
    "route_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "eta" TIMESTAMP(3),
    "arrived_at" TIMESTAMP(3),
    "status" "RouteStopStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "route_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_events" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "event_type" "EventType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB,

    CONSTRAINT "delivery_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "failure_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    "center_lat" DOUBLE PRECISION NOT NULL,
    "center_lng" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_zone_id_idx" ON "orders"("zone_id");

-- CreateIndex
CREATE INDEX "orders_assigned_driver_id_idx" ON "orders"("assigned_driver_id");

-- CreateIndex
CREATE INDEX "orders_created_at_idx" ON "orders"("created_at");

-- CreateIndex
CREATE INDEX "routes_driver_id_idx" ON "routes"("driver_id");

-- CreateIndex
CREATE INDEX "routes_status_idx" ON "routes"("status");

-- CreateIndex
CREATE INDEX "route_stops_order_id_idx" ON "route_stops"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "route_stops_route_id_sequence_key" ON "route_stops"("route_id", "sequence");

-- CreateIndex
CREATE INDEX "delivery_events_order_id_idx" ON "delivery_events"("order_id");

-- CreateIndex
CREATE INDEX "delivery_events_event_type_idx" ON "delivery_events"("event_type");

-- CreateIndex
CREATE INDEX "delivery_events_timestamp_idx" ON "delivery_events"("timestamp");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_assigned_driver_id_fkey" FOREIGN KEY ("assigned_driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_events" ADD CONSTRAINT "delivery_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
