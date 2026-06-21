import type { H3Event } from "h3";

import { drizzle } from "drizzle-orm/postgres-js";

import { relations } from "../db/relations";
// import * as schema from "../db/schema";

export function useDB(eventOrContext?: H3Event | CloudflareContext) {
  const isH3Event = eventOrContext && "node" in eventOrContext && "context" in eventOrContext;
  const runtimeConfig = useRuntimeConfig(isH3Event ? (eventOrContext as H3Event) : undefined);

  let databaseUrl: string | undefined;

  if (
    eventOrContext
    && "context" in eventOrContext
    && typeof eventOrContext.context === "object"
    && eventOrContext.context
    && "cloudflare" in eventOrContext.context
  ) {
    databaseUrl = eventOrContext.context.cloudflare?.env?.HYPERDRIVE?.connectionString;
  }
  else if (eventOrContext && "cloudflare" in eventOrContext) {
    databaseUrl = eventOrContext.cloudflare?.env?.HYPERDRIVE?.connectionString;
  }
  else if ((globalThis as unknown as GlobalEnv).__env__?.HYPERDRIVE?.connectionString) {
    databaseUrl = (globalThis as unknown as GlobalEnv).__env__?.HYPERDRIVE?.connectionString;
  }
  else {
    databaseUrl = runtimeConfig.databaseUrl;
  }

  if (!databaseUrl) {
    throw createError({
      statusCode: 500,
      message: "Missing database connection string",
    });
  }

  const db = drizzle({
    connection: databaseUrl,
    relations,
    casing: "snake_case",
    logger: false,
  });

  if (!db) throw new Error("Database not initialized");

  return { db };
}

export type DB = ReturnType<typeof useDB>["db"];
