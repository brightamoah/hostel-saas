import type { AuditContext } from "~~/shared/types";

import { and, eq, isNull } from "drizzle-orm";
import { randomUUID } from "uncrypto";

import { authHandoffToken } from "../schema";
import { auditLogQueries } from "./auditLog";

const TOKEN_TTL_MS = 2 * 60 * 1000;

export async function authHandoffQueries() {
  const { db } = useDB();
  const { logAudit } = await auditLogQueries();

  const createHandoffToken = async (userId: number, ctx: AuditContext) => {
    const token = randomUUID();
    const tokenHash = await hash(token);

    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    const [newToken] = await db
      .insert(authHandoffToken)
      .values({
        userId,
        tokenHash,
        expiresAt,
      })
      .returning();

    if (newToken) {
      await logAudit(db, ctx, {
        action: "auth_handoff_token.create",
        actionType: "CREATE",
        entityType: "auth",
        entityId: newToken.id,
        description: `Created auth handoff token for userId=${userId} with tokenId=${newToken.id}`,
        after: newToken,
      });
    }

    return { token, expiresAt };
  };

  const consumeHandoffToken = async (token: string, ctx: AuditContext) => {
    const candidates = await db
      .query
      .authHandoffToken
      .findMany({
        where: (table, { and, isNull, gt }) => and(
          isNull(table.usedAt),
          gt(table.expiresAt, new Date()),
        ),
        columns: { id: true, userId: true, tokenHash: true },
        limit: 50,
      });

    for (const row of candidates) {
      const match = await verifyHashedValue(row.tokenHash, token);

      if (!match) continue;

      const [updatedToken] = await db
        .update(authHandoffToken)
        .set({ usedAt: new Date() })
        .where(and(
          eq(authHandoffToken.id, row.id),
          isNull(authHandoffToken.usedAt),
        ))
        .returning();

      if (!updatedToken) continue; // Already consumed by another request
      if (updatedToken) {
        await logAudit(db, ctx, {
          action: "auth_handoff_token.consume",
          actionType: "UPDATE",
          entityType: "auth",
          entityId: updatedToken.id,
          description: `Consumed auth handoff token for userId=${row.userId} with tokenId=${updatedToken.id}`,
          after: updatedToken,
        });
      }

      return { userId: row.userId };
    }

    return null;
  };

  return {
    createHandoffToken,
    consumeHandoffToken,
  };
}
