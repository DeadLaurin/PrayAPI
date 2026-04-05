import type { FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

const openApiInfo = {
  openapi: "3.1.0" as const,
  info: {
    title: "PrayAPI",
    description:
      "Islamic prayer times API: **computed** locally with [adhan](https://github.com/batoulapps/adhan-js) or **fetched** from public [mawaqit.net](https://mawaqit.net) mosque pages. MIT licensed. Not affiliated with mawaqit.net.",
    version: "1.0.0",
    license: { name: "MIT" },
  },
  tags: [
    { name: "meta", description: "Service metadata" },
    { name: "times", description: "Computed prayer times (coordinates or city)" },
    { name: "mawaqit", description: "Prayer times from mawaqit.net (third-party)" },
    { name: "geography", description: "Country and city lists" },
  ],
};

/**
 * Must run **before** route definitions so `@fastify/swagger` can collect schemas.
 */
export async function registerOpenApi(app: FastifyInstance) {
  await app.register(swagger, {
    openapi: openApiInfo,
  });
}

/**
 * Must run **after** all API routes so Swagger UI routes register correctly on Fastify 5.
 */
export async function registerSwaggerUi(app: FastifyInstance) {
  await app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
    },
    staticCSP: true,
  });
}

/** Shared JSON Schema fragments for responses */
export const schemas = {
  error: {
    type: "object",
    properties: {
      error: { type: "string" },
      message: { type: "string" },
    },
  },
} as const;
