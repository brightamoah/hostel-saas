import type { H3Event } from "h3";

import { drizzle } from "drizzle-orm/postgres-js";

import { relations } from "../db/relations";
// import * as schema from "../db/schema";

export function useDB(event?: H3Event) {
  const runtimeConfig = useRuntimeConfig(event);

  let databaseUrl: string;

  event && event.context.cloudflare
    ? databaseUrl = event.context.cloudflare.env.HYPERDRIVE.connectionString
    : databaseUrl = runtimeConfig.databaseUrl;

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
