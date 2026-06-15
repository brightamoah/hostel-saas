import type { H3Event } from "h3";

import { createLogger, createError as evlogCreateError, useLogger } from "evlog";

type StructuredError = {
  statusCode?: number;
  statusMessage?: string;
  data?: any;
} & Error;

interface ServerEvent {
  method: string;
  path: string;
  context: H3EventContext & {
    /** Cloudflare Workers context (available when deployed to CF Workers) */cloudflare?: {
      context: {
        waitUntil: (promise: Promise<unknown>) => void;
      };
    }; /** Vercel Edge context (available when deployed to Vercel Edge) */
    waitUntil?: (promise: Promise<unknown>) => void;
  };
  node?: {
    res?: {
      statusCode?: number;
    };
  };
  response?: Response;
}

export function handleError(
  error: unknown,
  context: string,
  event?: H3Event,
): never {
  let safeError = error;

  if (
    error
    && typeof error === "object"
    && (error.constructor?.name === "ErrorEvent" || "colno" in error || "filename" in error)
  ) {
    const eventMessage = (error as any).message || "A database network socket drop occurred via WebSocket connection.";

    const standardErr = new Error(eventMessage);
    standardErr.name = (error as any).name || "NetworkError";
    standardErr.stack = (error as any).stack;
    (standardErr as any).code = (error as any).code;

    safeError = standardErr;
  }

  const err = safeError as StructuredError;

  const runtimeEvent = event || ({
    method: "CRON",
    path: `task:${context}`,
    context: {},
    node: { req: { headers: {} } },
  } as unknown as H3Event);

  let log;
  try {
    log = event ? useLogger(runtimeEvent as unknown as ServerEvent) : createLogger();
  }
  catch {
    log = createLogger();
  }

  log.set({ context });

  // Get Cloudflare-specific context
  const cloudflareContext = event?.context?.cloudflare;
  const requestId = cloudflareContext?.cf?.requestId || "system-cron";
  const cfRay = cloudflareContext?.cf?.cfRay || "system-cron";

  if (event?.context?.cloudflare) {
    const { cf } = event.context.cloudflare;
    log.set({
      requestId: cf?.requestId,
      cfRay: cf?.cfRay,
    });
  }

  // Structured log for Cloudflare observability
  const logData = {
    type: "APPLICATION_ERROR",
    level: "ERROR",
    timestamp: new Date().toISOString(),
    requestId,
    cfRay,
    context,
    path: event?.path || `task:${context}`,
    method: event?.method || "CRON",
    error: {
      name: err.name,
      message: err.message,
      code: (safeError as any)?.code,
      statusCode: err.statusCode,
      // Include stack trace in production for Cloudflare logs
      stack: err.stack ? err.stack.split("\n").slice(0, 5).join(" | ") : undefined,
    },
    // Include user agent for debugging
    userAgent: event?.node.req.headers["user-agent"] || "unknown",
  };

  console.error(JSON.stringify(logData));

  console.error(`[${context} Error] ${err.name}: ${err.message}`);
  console.error(`Path: ${event?.path}, Status: ${err.statusCode || 500}`);

  switch ((safeError as any)?.code) {
    case "23505": // unique_violation
      throw createError({
        statusCode: 409,
        message: "A record with one or more of the provided values already exists.",
        statusMessage: "Conflict",
      });

    case "23503": // foreign_key_violation
      throw createError({
        statusCode: 400,
        message: "Invalid association. One or more related entities do not exist.",
        statusMessage: "Bad Request",
      });

    case "42P01": // undefined_table
      throw createError({
        statusCode: 503,
        message: "Database schema error. Please contact support.",
        statusMessage: "Service Unavailable",
      });
  }

  // If the error already has a status code, it was thrown deliberately with createError.
  if (err?.statusCode) throw safeError;

  const rawMessage = String(err?.data?.message ?? err?.message ?? "").trim();
  const lower = rawMessage.toLowerCase();

  const serverPatterns = [
    "failed query",
    "syntax error",
    "duplicate key",
    "relation",
    "internal server error",
    "null value in column",
    "permission denied",
    "getaddrinfo enotfound",
    "enotfound",
    "neon.tech",
    "econnrefused",
    "pooler",
    "etimedout",
  ];

  if (serverPatterns.some(p => lower.includes(p))) {
    // keep original error in server console for debugging
    console.error(`Error (${context}):`, err);

    throw createError({
      statusCode: 500,
      message: "Server error. Please check your network and try again later.",
      statusMessage: "Server Network Unavailable",
    });
  }

  throw evlogCreateError({
    cause: safeError as Error,
    message: (safeError as any)?.message || "An unexpected error occurred",
    status: (safeError as any)?.statusCode || 500,
    // Technical details for logs but hidden from clients
    internal: {
      originalCode: (safeError as any)?.code,
      stack: (safeError as any)?.stack,
    },
  });
}
