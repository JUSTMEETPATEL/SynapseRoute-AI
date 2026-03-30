import { builder } from "../builder.js";

// ─── Enums ───
const OrderStatusEnum = builder.enumType("OrderStatus", {
  values: ["PENDING", "ASSIGNED", "IN_TRANSIT", "DELIVERED", "FAILED"] as const,
});

const LocationTypeEnum = builder.enumType("LocationType", {
  values: ["RESIDENTIAL", "COMMERCIAL"] as const,
});

const TimePreferenceEnum = builder.enumType("TimePreference", {
  values: ["ASAP", "SCHEDULED"] as const,
});

const RiskTierEnum = builder.enumType("RiskTier", {
  values: ["LOW", "MEDIUM", "HIGH"] as const,
});

// ─── Order Type ───
builder.prismaObject("Order", {
  fields: (t) => ({
    id: t.exposeID("id"),
    recipientName: t.exposeString("recipientName"),
    rawAddress: t.exposeString("rawAddress"),
    lat: t.exposeFloat("lat", { nullable: true }),
    lng: t.exposeFloat("lng", { nullable: true }),
    zoneId: t.exposeString("zoneId", { nullable: true }),
    locationType: t.expose("locationType", { type: LocationTypeEnum }),
    timePreference: t.expose("timePreference", { type: TimePreferenceEnum }),
    scheduledTime: t.expose("scheduledTime", { type: "DateTime", nullable: true }),
    status: t.expose("status", { type: OrderStatusEnum }),
    failureProb: t.exposeFloat("failureProb", { nullable: true }),
    riskTier: t.expose("riskTier", { type: RiskTierEnum, nullable: true }),
    eta: t.expose("eta", { type: "DateTime", nullable: true }),
    createdAt: t.expose("createdAt", { type: "DateTime" }),
    completedAt: t.expose("completedAt", { type: "DateTime", nullable: true }),
    // Relations
    zone: t.relation("zone", { nullable: true }),
    assignedDriver: t.relation("assignedDriver", { nullable: true }),
    routeStops: t.relation("routeStops"),
    events: t.relation("events"),
  }),
});

// ─── Queries ───
builder.queryField("orders", (t) =>
  t.prismaField({
    type: ["Order"],
    authScopes: { authenticated: true },
    args: {
      status: t.arg({ type: OrderStatusEnum, required: false }),
      riskTier: t.arg({ type: RiskTierEnum, required: false }),
      limit: t.arg.int({ required: false, defaultValue: 20 }),
      offset: t.arg.int({ required: false, defaultValue: 0 }),
    },
    resolve: async (query, _parent, args, _ctx) => {
      return _ctx.prisma.order.findMany({
        ...query,
        where: {
          ...(args.status && { status: args.status }),
          ...(args.riskTier && { riskTier: args.riskTier }),
        },
        take: args.limit ?? 20,
        skip: args.offset ?? 0,
        orderBy: { createdAt: "desc" },
      });
    },
  })
);

builder.queryField("order", (t) =>
  t.prismaField({
    type: "Order",
    nullable: true,
    authScopes: { authenticated: true },
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (query, _parent, args, _ctx) => {
      return _ctx.prisma.order.findUnique({
        ...query,
        where: { id: args.id },
      });
    },
  })
);

// ─── Mutations ───
builder.mutationField("createOrder", (t) =>
  t.prismaField({
    type: "Order",
    authScopes: { authenticated: true },
    args: {
      recipientName: t.arg.string({ required: true }),
      address: t.arg.string({ required: true }),
      locationType: t.arg({ type: LocationTypeEnum, required: true }),
      timePreference: t.arg({ type: TimePreferenceEnum, required: true }),
    },
    resolve: async (query, _parent, args, _ctx) => {
      return _ctx.prisma.order.create({
        ...query,
        data: {
          recipientName: args.recipientName,
          rawAddress: args.address,
          locationType: args.locationType,
          timePreference: args.timePreference,
        },
      });
    },
  })
);

builder.mutationField("updateOrderStatus", (t) =>
  t.prismaField({
    type: "Order",
    authScopes: { dispatcher: true },
    args: {
      id: t.arg.string({ required: true }),
      status: t.arg({ type: OrderStatusEnum, required: true }),
    },
    resolve: async (query, _parent, args, _ctx) => {
      return _ctx.prisma.order.update({
        ...query,
        where: { id: args.id },
        data: {
          status: args.status,
          completedAt: ["DELIVERED", "FAILED"].includes(args.status) ? new Date() : undefined,
        },
      });
    },
  })
);
