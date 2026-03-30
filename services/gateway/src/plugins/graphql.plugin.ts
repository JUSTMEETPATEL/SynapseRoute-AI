import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import mercurius from "mercurius";
import { builder } from "../graphql/index.js";
import { prisma } from "../lib/prisma.js";
import type { GqlContext } from "../graphql/builder.js";

async function graphqlPlugin(app: FastifyInstance) {
  const schema = builder.toSchema();

  await app.register(mercurius, {
    schema,
    graphiql: process.env.NODE_ENV !== "production",
    path: "/graphql",
    context: async (request): Promise<GqlContext> => ({
      prisma,
      session: request.session ?? null,
    }),
    errorFormatter: (error, ctx) => {
      const response = mercurius.defaultErrorFormatter(error, ctx);
      // Remove stack traces in production
      if (process.env.NODE_ENV === "production") {
        response.response = {
          ...response.response,
          errors: response.response.errors?.map((e) => ({
            ...e,
            extensions: { ...e.extensions, stacktrace: undefined },
          })),
        };
      }
      return response;
    },
  });

  app.log.info("GraphQL API mounted at /graphql");
}

export default fp(graphqlPlugin, {
  name: "graphql",
  dependencies: ["auth"],
  fastify: "5.x",
});
