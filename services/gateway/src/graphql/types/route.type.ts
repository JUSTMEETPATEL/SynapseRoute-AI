import { builder } from "../builder.js";

// ─── Enums ───
const RouteStatusEnum = builder.enumType("RouteStatus", {
  values: ["PLANNED", "ACTIVE", "COMPLETED"] as const,
});

const RouteStopStatusEnum = builder.enumType("RouteStopStatus", {
  values: ["PENDING", "COMPLETED", "FAILED", "SKIPPED"] as const,
});

const EventTypeEnum = builder.enumType("EventType", {
  values: ["RISK_FLAGGED", "REROUTED", "DELIVERED", "FAILED", "DELAYED"] as const,
});

// ─── Route Type ───
builder.prismaObject("Route", {
  fields: (t) => ({
    id: t.exposeID("id"),
    depotLat: t.exposeFloat("depotLat"),
    depotLng: t.exposeFloat("depotLng"),
    totalDistanceKm: t.exposeFloat("totalDistanceKm", { nullable: true }),
    totalDurationMin: t.exposeInt("totalDurationMin", { nullable: true }),
    confidenceScore: t.exposeFloat("confidenceScore", { nullable: true }),
    status: t.expose("status", { type: RouteStatusEnum }),
    createdAt: t.expose("createdAt", { type: "DateTime" }),
    updatedAt: t.expose("updatedAt", { type: "DateTime" }),
    // Relations
    driver: t.relation("driver"),
    stops: t.relation("stops"),
  }),
});

// ─── RouteStop Type ───
builder.prismaObject("RouteStop", {
  fields: (t) => ({
    id: t.exposeID("id"),
    sequence: t.exposeInt("sequence"),
    eta: t.expose("eta", { type: "DateTime", nullable: true }),
    arrivedAt: t.expose("arrivedAt", { type: "DateTime", nullable: true }),
    status: t.expose("status", { type: RouteStopStatusEnum }),
    // Relations
    order: t.relation("order"),
    route: t.relation("route"),
  }),
});

// ─── DeliveryEvent Type ───
builder.prismaObject("DeliveryEvent", {
  fields: (t) => ({
    id: t.exposeID("id"),
    eventType: t.expose("eventType", { type: EventTypeEnum }),
    timestamp: t.expose("timestamp", { type: "DateTime" }),
    payload: t.expose("payload", { type: "JSON", nullable: true }),
    // Relations
    order: t.relation("order"),
  }),
});

// ─── Zone Type ───
builder.prismaObject("Zone", {
  fields: (t) => ({
    id: t.exposeID("id"),
    name: t.exposeString("name"),
    failureRate: t.exposeFloat("failureRate"),
    centerLat: t.exposeFloat("centerLat"),
    centerLng: t.exposeFloat("centerLng"),
    orders: t.relation("orders"),
  }),
});

// ─── Queries ───
builder.queryField("routes", (t) =>
  t.prismaField({
    type: ["Route"],
    authScopes: { authenticated: true },
    args: {
      status: t.arg({ type: RouteStatusEnum, required: false }),
      driverId: t.arg.string({ required: false }),
    },
    resolve: async (query, _parent, args, _ctx) => {
      return _ctx.prisma.route.findMany({
        ...query,
        where: {
          ...(args.status && { status: args.status }),
          ...(args.driverId && { driverId: args.driverId }),
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    },
  })
);

builder.queryField("zones", (t) =>
  t.prismaField({
    type: ["Zone"],
    authScopes: { authenticated: true },
    resolve: async (query, _parent, _args, _ctx) => {
      return _ctx.prisma.zone.findMany({
        ...query,
        orderBy: { failureRate: "desc" },
      });
    },
  })
);
