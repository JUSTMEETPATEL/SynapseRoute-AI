import { builder } from "../builder.js";

// ─── Enums ───
const DriverStatusEnum = builder.enumType("DriverStatus", {
  values: ["IDLE", "ON_ROUTE", "BREAK"] as const,
});

// ─── Driver Type ───
builder.prismaObject("Driver", {
  fields: (t) => ({
    id: t.exposeID("id"),
    name: t.exposeString("name"),
    currentLat: t.exposeFloat("currentLat", { nullable: true }),
    currentLng: t.exposeFloat("currentLng", { nullable: true }),
    status: t.expose("status", { type: DriverStatusEnum }),
    activeRouteId: t.exposeString("activeRouteId", { nullable: true }),
    totalDeliveries: t.exposeInt("totalDeliveries"),
    successRate: t.exposeFloat("successRate"),
    createdAt: t.expose("createdAt", { type: "DateTime" }),
    // Relations
    orders: t.relation("orders"),
    routes: t.relation("routes"),
  }),
});

// ─── Queries ───
builder.queryField("drivers", (t) =>
  t.prismaField({
    type: ["Driver"],
    authScopes: { authenticated: true },
    args: {
      status: t.arg({ type: DriverStatusEnum, required: false }),
    },
    resolve: async (query, _parent, args, _ctx) => {
      return _ctx.prisma.driver.findMany({
        ...query,
        where: args.status ? { status: args.status } : {},
        orderBy: { name: "asc" },
      });
    },
  })
);

builder.queryField("driver", (t) =>
  t.prismaField({
    type: "Driver",
    nullable: true,
    authScopes: { authenticated: true },
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (query, _parent, args, _ctx) => {
      return _ctx.prisma.driver.findUnique({
        ...query,
        where: { id: args.id },
      });
    },
  })
);

// ─── Mutations ───
builder.mutationField("createDriver", (t) =>
  t.prismaField({
    type: "Driver",
    authScopes: { admin: true },
    args: {
      name: t.arg.string({ required: true }),
      lat: t.arg.float({ required: false }),
      lng: t.arg.float({ required: false }),
    },
    resolve: async (query, _parent, args, _ctx) => {
      return _ctx.prisma.driver.create({
        ...query,
        data: {
          name: args.name,
          currentLat: args.lat,
          currentLng: args.lng,
        },
      });
    },
  })
);
