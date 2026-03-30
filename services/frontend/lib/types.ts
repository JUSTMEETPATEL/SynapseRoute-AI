// ─── Type Definitions (matches backend Prisma schema) ───

// Enums
export type OrderStatus = "PENDING" | "ASSIGNED" | "IN_TRANSIT" | "DELIVERED" | "FAILED";
export type RiskTier = "LOW" | "MEDIUM" | "HIGH";
export type DriverStatus = "IDLE" | "ON_ROUTE" | "BREAK";
export type LocationType = "RESIDENTIAL" | "COMMERCIAL";
export type TimePreference = "ASAP" | "SCHEDULED";
export type EventType = "PICKED_UP" | "IN_TRANSIT" | "DELIVERED" | "FAILED" | "RISK_FLAGGED" | "REROUTED" | "DELAYED";

// ─── Domain Models ───

export interface Zone {
  id: string;
  name: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  failureRate: number;
  _count?: { orders: number };
}

export interface Driver {
  id: string;
  name: string;
  currentLat: number | null;
  currentLng: number | null;
  status: DriverStatus;
  successRate: number;
  activeRouteId: string | null;
  createdAt: string;
  _count?: { orders: number; routes: number };
}

export interface Order {
  id: string;
  recipientName: string;
  rawAddress: string;
  normalizedAddress: string | null;
  lat: number | null;
  lng: number | null;
  locationType: LocationType;
  timePreference: TimePreference;
  scheduledTime: string | null;
  status: OrderStatus;
  riskTier: RiskTier | null;
  failureProb: number | null;
  zoneId: string | null;
  zone: Zone | null;
  driverId: string | null;
  assignedDriver: Pick<Driver, "id" | "name"> | null;
  createdAt: string;
  completedAt: string | null;
}

export interface RouteStop {
  id: string;
  routeId: string;
  orderId: string;
  sequence: number;
  status: string;
  eta: string | null;
  arrivedAt: string | null;
  order: Order;
}

export interface Route {
  id: string;
  driverId: string;
  status: string;
  totalDistanceKm: number | null;
  totalDurationMin: number | null;
  confidenceScore: number | null;
  depotLat: number;
  depotLng: number;
  stops: RouteStop[];
  driver?: Pick<Driver, "id" | "name">;
}

export interface DeliveryEvent {
  id: string;
  orderId: string;
  eventType: EventType;
  timestamp: string;
  payload: unknown;
  order?: Pick<Order, "id" | "recipientName">;
}

// ─── API Response Shapes ───

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AnalyticsSummary {
  totals: {
    orders: number;
    delivered: number;
    failed: number;
    pending: number;
    inTransit: number;
    assigned: number;
  };
  rates: {
    deliverySuccessRate: number;
    avgDriverSuccessRate: number;
  };
  risk: {
    low: number;
    medium: number;
    high: number;
  };
  zones: Array<{
    id: string;
    name: string;
    failureRate: number;
    orderCount: number;
  }>;
  recentEvents: Array<{
    id: string;
    orderId: string;
    recipientName: string;
    eventType: EventType;
    timestamp: string;
    payload: unknown;
  }>;
}

export interface DriverPosition {
  id: string;
  name: string;
  currentLat: number | null;
  currentLng: number | null;
  status: DriverStatus;
  activeRouteId: string | null;
}

export interface HealthStatus {
  status: string;
  timestamp: string;
  services: Record<string, string>;
}

export interface SimulationTick {
  tickAt: string;
  driversProcessed: number;
  events: Array<{
    driverId: string;
    action: string;
    orderId?: string;
  }>;
}

export interface CreateOrderInput {
  recipientName: string;
  address: string;
  locationType: LocationType;
  timePreference: TimePreference;
  scheduledTime?: string;
}

export interface OptimizeRouteInput {
  orderIds: string[];
  driverIds: string[];
  depotLat: number;
  depotLng: number;
}

export interface OptimizeRouteResponse {
  routes: Route[];
  modelUsed: string;
  computationTimeMs: number;
}

// ─── Auth Types ───

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
}

// ─── WebSocket Event Types ───

export interface DriverMovedEvent {
  driverId: string;
  name?: string;
  lat: number;
  lng: number;
  status?: string;
  timestamp: number;
}

export interface DeliveryEventWS {
  orderId: string;
  eventType: string;
  recipientName: string;
  timestamp: number;
  payload?: unknown;
}

export interface RiskAlertWS {
  orderId: string;
  recipientName: string;
  failureProbability: number;
  riskTier: string;
  contributingFactors: string[];
  timestamp: number;
}
