import type { H3Event } from "h3";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { relations } from "../db/relations";
import * as schema from "../db/schema";

let sqlClient: ReturnType<typeof postgres> | null = null;

export function useDB(event?: H3Event) {
  const runtimeConfig = useRuntimeConfig(event);

  let databaseUrl: string;

  event && event.context.cloudflare
    ? databaseUrl = event.context.cloudflare.env.HYPERDRIVE.connectionString
    : databaseUrl = runtimeConfig.databaseUrl;

  if (!databaseUrl) throw new Error("Missing runtimeConfig.databaseUrl");

  if (!sqlClient) {
    sqlClient = postgres(databaseUrl, {
      fetch_types: false,
      prepare: false,
      idle_timeout: 20,
      max_lifetime: 60,
      max: 1,
    });
  }

  const db = drizzle({
    client: sqlClient,
    relations,
    schema,
    casing: "snake_case",
    logger: false,
  });

  if (!db) throw new Error("Database not initialized");

  return { db };
}

export type DB = ReturnType<typeof useDB>["db"];
