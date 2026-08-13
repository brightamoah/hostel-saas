import { sql } from "drizzle-orm";

defineRouteMeta({
  openAPI: {
    summary: "Health Check",
    tags: ["Public", "Health"],
    responses: {
      200: {
        description: "Health Check",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                status: { type: "string" },
                timestamp: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
});

export default defineEventHandler(async (event) => {
  const started = performance.now();

  const checks = {
    database: {
      status: "healthy" as "healthy" | "unhealthy",
      latency: 0,
    },
  };

  let status: "healthy" | "degraded" = "healthy";

  try {
    const { db } = useDB(event);

    const dbStarted = performance.now();

    await db.execute(sql`SELECT 1`);

    checks.database.latency = Math.round(performance.now() - dbStarted);
  }
  catch {
    checks.database.status = "unhealthy";
    status = "degraded";

    setResponseStatus(event, 503);
  }

  return {
    status,
    service: "kayanest-api",
    timestamp: new Date().toISOString(),
    environment: import.meta.dev ? "development" : "production",
    uptime: Math.floor(process.uptime()),
    responseTime: `${Math.round(performance.now() - started)}ms`,
    checks,
  };
});
