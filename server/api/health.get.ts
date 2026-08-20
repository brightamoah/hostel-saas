import { sql } from "drizzle-orm";

defineRouteMeta({
  openAPI: {
    summary: "Health Check",
    description: "Returns the health status of the API and its dependencies.",
    tags: ["Public", "Health"],
    responses: {
      200: {
        description: "Service is healthy.",
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: [
                "status",
                "service",
                "timestamp",
                "environment",
                "responseTime",
                "checks",
              ],
              properties: {
                status: {
                  type: "string",
                  enum: ["healthy", "degraded"],
                  description: "Overall health status of the service.",
                },
                service: {
                  type: "string",
                  example: "kayanest-api",
                },
                timestamp: {
                  type: "string",
                  format: "date-time",
                  description: "Time the health check was performed.",
                },
                environment: {
                  type: "string",
                  enum: ["development", "production"],
                },
                responseTime: {
                  type: "string",
                  example: "13ms",
                  description: "Total time taken to complete the health check.",
                },
                checks: {
                  type: "object",
                  required: ["database"],
                  properties: {
                    database: {
                      type: "object",
                      required: ["status", "latency"],
                      properties: {
                        status: {
                          type: "string",
                          enum: ["healthy", "unhealthy"],
                          description: "Database connectivity status.",
                        },
                        latency: {
                          type: "integer",
                          description: "Database query latency in milliseconds.",
                          example: 11,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      503: {
        description: "One or more health checks failed.",
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: [
                "status",
                "service",
                "timestamp",
                "environment",
                "responseTime",
                "checks",
              ],
              properties: {
                status: {
                  type: "string",
                  enum: ["degraded"],
                },
                service: {
                  type: "string",
                },
                timestamp: {
                  type: "string",
                  format: "date-time",
                },
                environment: {
                  type: "string",
                  enum: ["development", "production"],
                },
                responseTime: {
                  type: "string",
                },
                checks: {
                  type: "object",
                  properties: {
                    database: {
                      type: "object",
                      properties: {
                        status: {
                          type: "string",
                          enum: ["unhealthy"],
                        },
                        latency: {
                          type: "integer",
                        },
                      },
                    },
                  },
                },
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
    responseTime: `${Math.round(performance.now() - started)}ms`,
    checks,
  };
});
