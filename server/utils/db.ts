import { drizzle } from "drizzle-orm/neon-serverless";

import * as schema from "../db/schema/index";

export function useDB() {
  const runtimeConfig = useRuntimeConfig();

  const databaseUrl = runtimeConfig.databaseUrl;

  if (!databaseUrl) throw new Error("Missing runtimeConfig.databaseUrl");

  const db = drizzle(databaseUrl, {
    schema,
    casing: "snake_case",
    logger: import.meta.dev,
  });

  if (!db) throw new Error("Database not initialized");

  return { db };
}

export type DB = ReturnType<typeof useDB>["db"];
