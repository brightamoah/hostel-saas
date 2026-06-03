import type { H3Event } from "h3";

import { drizzle } from "drizzle-orm/neon-serverless";

import { relations } from "../db/relations";
import * as schema from "../db/schema";

export function useDB(event?: H3Event) {
  const runtimeConfig = useRuntimeConfig();

  let databaseUrl: string;

  if (event && event.context.cloudflare) databaseUrl = event.context.cloudflare.env.HYPERDRIVE.connectionString;
  else databaseUrl = runtimeConfig.databaseUrl;

  if (!databaseUrl) throw new Error("Missing runtimeConfig.databaseUrl");

  const db = drizzle({
    connection: databaseUrl,
    relations,
    schema,
    casing: "snake_case",
    logger: false,
  });

  if (!db) throw new Error("Database not initialized");

  return { db };
}

export type DB = ReturnType<typeof useDB>["db"];
