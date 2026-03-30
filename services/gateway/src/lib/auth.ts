import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma.js";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,     // refresh session daily
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "DISPATCHER",
        input: false, // cannot be set during signup
      },
    },
  },

  trustedOrigins: [
    "http://localhost:3000", // frontend
    "http://localhost:3001", // gateway
  ],
});

export type AuthSession = typeof auth.$Infer.Session;
export type AuthUser = typeof auth.$Infer.Session.user;
