import SchemaBuilder from "@pothos/core";
import PrismaPlugin from "@pothos/plugin-prisma";
import ScopeAuthPlugin from "@pothos/plugin-scope-auth";
import type PrismaTypes from "@pothos/plugin-prisma/generated";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import type { AuthSession } from "../lib/auth.js";

// ─── Context type for GraphQL resolvers ───
export interface GqlContext {
  prisma: typeof prisma;
  session: AuthSession | null;
}

// ─── Builder with plugins ───
export const builder = new SchemaBuilder<{
  PrismaTypes: PrismaTypes;
  Context: GqlContext;
  AuthScopes: {
    authenticated: boolean;
    admin: boolean;
    dispatcher: boolean;
  };
  Scalars: {
    DateTime: { Input: Date; Output: Date };
    JSON: { Input: unknown; Output: unknown };
  };
}>({
  plugins: [ScopeAuthPlugin, PrismaPlugin],
  prisma: {
    client: prisma,
    dmmf: Prisma.dmmf,
  },
  scopeAuth: {
    authScopes: async (context) => ({
      authenticated: !!context.session?.user,
      admin: (context.session?.user as { role?: string })?.role === "ADMIN",
      dispatcher:
        (context.session?.user as { role?: string })?.role === "DISPATCHER" ||
        (context.session?.user as { role?: string })?.role === "ADMIN",
    }),
  },
});

// ─── Scalars ───
builder.scalarType("DateTime", {
  serialize: (val) => (val instanceof Date ? val.toISOString() : val),
  parseValue: (val) => new Date(val as string),
});

builder.scalarType("JSON", {
  serialize: (val) => val,
  parseValue: (val) => val,
});

// Initialize query and mutation types
builder.queryType({});
builder.mutationType({});
