import type { AdminScope, AuditContext } from "~~/shared/types";
import type { H3Event } from "h3";

import { randomUUID } from "uncrypto";

/**
 * Recursively redact sensitive fields from any object/array.
 * Operates on a best-effort basis: mutates a deep clone, not the original.
 */
export function redact(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;

  const clone = JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  const sensitiveFields = new Set([
    "password",
    "resettoken",
    "verificationtoken",
    "verificationtokenexpiresat",
    "tokenhash",
    "phonenumber",
    "emergencycontactphonenumber",
    "emergencycontactemail",
    "healthconditions",
    "dateofbirth",
    "address",
    "phonenumber",
  ]);

  function redactObject(obj: unknown): unknown {
    if (Array.isArray(obj)) {
      return obj.map(item => redactObject(item));
    }
    if (obj && typeof obj === "object") {
      const output: Record<string, unknown> = {};
      for (const key of Object.keys(obj as Record<string, unknown>)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveFields.has(lowerKey)) {
          output[key] = "[REDACTED]";
        }
        else {
          output[key] = redactObject((obj as Record<string, unknown>)[key]);
        }
      }
      return output;
    }
    return obj;
  }

  return redactObject(clone);
}

type DiffEntry = { from: unknown; to: unknown };
export type AuditDiff = Record<string, DiffEntry>;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function stable(v: unknown) {
  return JSON.stringify(v);
}

export function computeAuditDiff(before: unknown, after: unknown): AuditDiff | null {
  if (!isPlainObject(before) || !isPlainObject(after)) return null;

  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const out: AuditDiff = {};

  for (const k of keys) {
    const b = (before as any)[k];
    const a = (after as any)[k];

    if (stable(b) !== stable(a)) {
      out[k] = { from: b ?? null, to: a ?? null };
    }
  }

  return Object.keys(out).length ? out : null;
}

/**
 * Safely read request headers + ip for audit meta.
 */
function getRequestMeta(event?: H3Event) {
  if (!event) {
    return { ipAddress: null, userAgent: null, requestId: null };
  }

  const headers = getRequestHeaders(event) ?? event.headers;
  const userAgent = typeof headers["user-agent"] === "string"
    ? headers["user-agent"]
    : null;

  const requestIdHeader = headers["x-request-id"];

  const requestId = typeof requestIdHeader === "string"
    ? requestIdHeader
    : Array.isArray(requestIdHeader)
      ? requestIdHeader[0] ?? null
      : randomUUID();

  const forwardedFor = headers["x-forwarded-for"];
  const ipFromForwardedFor = typeof forwardedFor === "string"
    ? forwardedFor.split(",")[0]?.trim()
    : null;

  const ip = getIP(event);

  const ipAddress
    = normalizeIp(ip)
      ?? normalizeIp(ipFromForwardedFor)
      ?? normalizeIp(event.node.req.socket.remoteAddress)
      ?? null;

  return { ipAddress, userAgent, requestId };
}

export type AuditRequestInfo = { request?: Request | null; requestId?: string | null };

type StudentAuditInput = {
  kind: "student";
  event?: H3Event;
  userId: number;
  companyId: number;
  hostelId?: number | null;
};

type AdminAuditInput = {
  kind: "admin";
  event?: H3Event;
  scope: AdminScope;
  target: {
    companyId: number | null;
    hostelId?: number | null;
  };
};

type SystemAuditInput = {
  kind: "system";
  event?: H3Event;
  companyId: number | null;
  hostelId?: number | null;
};

export function getAuditContext(input: StudentAuditInput | AdminAuditInput | SystemAuditInput): AuditContext {
  const { ipAddress, userAgent, requestId } = getRequestMeta(input.event);

  if (input.kind === "admin") {
    const scope = input.scope;

    const companyId = scope.isPlatformAdmin
      ? (input.target?.companyId ?? null)
      : (scope.companyId ?? null);

    const hostelId = scope.isPlatformAdmin
      ? (input.target?.hostelId ?? null)
      : (scope.hostelId ?? scope.adminData?.hostelId ?? null);

    return {
      companyId,
      hostelId,
      actor: {
        actorType: "admin",
        actorAdminId: scope.adminData.id,
        actorUserId: scope.userId ?? null,
      },
      ipAddress,
      userAgent,
      requestId,
    };
  }

  if (input.kind === "student") {
    return {
      companyId: input.companyId,
      hostelId: input.hostelId ?? null,

      actor: {
        actorType: "student",
        actorUserId: input.userId,
      },

      ipAddress,
      userAgent,
      requestId,
    };
  }

  return {
    companyId: input.companyId,
    hostelId: input.hostelId ?? null,

    actor: { actorType: "system" },

    ipAddress,
    userAgent,
    requestId,
  };
}
