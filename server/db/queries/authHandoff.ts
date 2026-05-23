import { and, eq, isNull } from "drizzle-orm";
import { randomUUID } from "uncrypto";

import { authHandoffToken } from "../schema";

const TOKEN_TTL_MS = 2 * 60 * 1000;

export async function authHandoffQueries() {
  const { db } = useDB();

  const createHandoffToken = async (userId: number) => {
    const token = randomUUID();
    const tokenHash = await hash(token);

    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    await db
      .insert(authHandoffToken)
      .values({
        userId,
        tokenHash,
        expiresAt,
      })
      .returning();
    return { token, expiresAt };
  };

  const consumeHandoffToken = async (token: string) => {
    const candidates = await db
      .query
      .authHandoffToken
      .findMany({
        where: {
          usedAt: { isNull: true },
          expiresAt: { gt: new Date() },
        },
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

      if (!updatedToken) continue;

      return { userId: row.userId };
    }

    return null;
  };

  return {
    createHandoffToken,
    consumeHandoffToken,
  };
}
