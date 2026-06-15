import type { H3Event } from "h3";

import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { and, eq, isNull } from "drizzle-orm";
import { randomUUID } from "uncrypto";

import { authHandoffToken } from "../schema";

const TOKEN_TTL_MS = 2 * 60 * 1000;

export async function authHandoffQueries(event?: H3Event) {
  const { db } = useDB(event);

  const createHandoffToken = async (userId: number) => {
    const token = randomUUID();
    const tokenHash = bytesToHex(sha256(utf8ToBytes(token)));

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
    const hashed = bytesToHex(sha256(utf8ToBytes(token.trim())));

    const [updatedToken] = await db
      .update(authHandoffToken)
      .set({ usedAt: new Date() })
      .where(and(
        eq(authHandoffToken.tokenHash, hashed),
        isNull(authHandoffToken.usedAt),
        // Note: expiresAt is checked here if needed, but since it's an update, we should check it
      ))
      .returning();

    // Check expiration in JS or via Drizzle (using raw sql or operator)
    if (!updatedToken || updatedToken.expiresAt < new Date()) return null;

    return { userId: updatedToken.userId };
  };

  return {
    createHandoffToken,
    consumeHandoffToken,
  };
}
