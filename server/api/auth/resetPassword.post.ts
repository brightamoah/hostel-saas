import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { user } from "~~/server/db/schema";
import { handleError } from "~~/server/utils/errorHandler";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  try {
    const { db } = useDB(event);

    const body = await readValidatedBody(event, body => passwordResetSchema.safeParse(body));

    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: `Invalid request: ${body.error.issues
          .map(i => i.message)
          .join(", ")}`,
      });
    }

    const { token, newPassword } = body.data;

    if (!token || !newPassword) {
      throw createError({
        statusCode: 400,
        message: "Token and new password required",
      });
    }

    const hashedToken = bytesToHex(sha256(utf8ToBytes(token.trim())));

    const existingUser = await db
      .query
      .user
      .findFirst({
        where: {
          resetToken: hashedToken,
        },
      });

    if (
      !existingUser
      || !existingUser.resetToken
      || !existingUser.resetTokenExpiresAt
    ) {
      throw createError({
        statusCode: 400,
        message: "Invalid or expired password reset token",
      });
    }

    const now = new Date();
    if (existingUser.resetTokenExpiresAt < now) {
      await db.update(user).set({
        resetToken: null,
        resetTokenExpiresAt: null,
      }).where(eq(user.id, existingUser.id));

      throw createError({
        statusCode: 410,
        message: "Password reset token has expired. Please request a new one.",
      });
    }

    const newHashedPassword = await hash(newPassword);
    // const newHashedPassword = await hash(newPassword);

    await db.update(user).set({
      password: newHashedPassword,
      resetToken: null,
      resetTokenExpiresAt: null,
    }).where(eq(user.id, existingUser.id));

    return {
      success: true,
      message: "Password has been reset successfully.",
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Reset Password", event);
  }
});
