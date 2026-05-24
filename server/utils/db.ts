import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

import { relations } from "../db/relations";
import * as schema from "../db/schema";

export function useDB() {
  const runtimeConfig = useRuntimeConfig();

  const databaseUrl = runtimeConfig.databaseUrl;

  if (!databaseUrl) throw new Error("Missing runtimeConfig.databaseUrl");

  const pool = new Pool({ connectionString: databaseUrl });

  const db = drizzle({
    client: pool,
    relations,
    schema,
    casing: "snake_case",
    logger: false,
  });

  if (!db) throw new Error("Database not initialized");

  return { db };
}

export type DB = ReturnType<typeof useDB>["db"];
