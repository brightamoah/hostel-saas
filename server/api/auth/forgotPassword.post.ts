import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { eq } from "drizzle-orm";
import { randomUUID } from "uncrypto";
import { userQueries } from "~~/server/db/queries/user";
import { user } from "~~/server/db/schema";
import { handleError } from "~~/server/utils/errorHandler";
import { getResetPasswordTemplate } from "~~/shared/utils/emailTemplate";

export default defineEventHandler(async (event) => {
  try {
    const { db } = useDB(event);
    // const runtimeConfig = useRuntimeConfig(event);

    const body = await readValidatedBody(event, body => verifyEmailSchema.safeParse(body));

    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: `Invalid request: ${body.error.issues
          .map(i => i.message)
          .join(", ")}`,
      });
    }

    const { email } = body.data;
    const { getUserByEmail } = await userQueries(event);

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await getUserByEmail(normalizedEmail);

    if (
      !existingUser
      || !existingUser.emailVerified
    ) {
      return {
        success: true,
        message: "If an account exists, a reset email has been sent.",
      };
    }

    const resetToken = randomUUID();
    const hashedToken = bytesToHex(sha256(utf8ToBytes(resetToken)));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    await db.update(user)
      .set({
        resetToken: hashedToken,
        resetTokenExpiresAt: expiresAt,
      })
      .where(eq(user.id, existingUser.id));

    const resetUrl = `${event.headers.get("origin")}/auth/resetPassword?token=${resetToken}`;

    const appName = "KayaNest";
    const { html, text } = getResetPasswordTemplate(resetUrl, existingUser.name, appName);

    await enqueueApplicationEmail(event, {
      to: { name: existingUser.name, email: normalizedEmail },
      subject: `Reset Your Password`,
      html,
      text,
      recipientUserId: existingUser.id,
      isTransactional: true,
    });

    return {
      success: true,
      message: "Password reset email sent. Check your inbox or spam.",
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Forgot Password", event);
  }
});
