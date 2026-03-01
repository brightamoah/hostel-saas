import { userQueries } from "~~/server/db/queries/user";
import { user } from "~~/server/db/schema";
import { useDB } from "~~/server/utils/db";
import { handleError } from "~~/server/utils/errorHandler";
import { eq } from "drizzle-orm";
import { randomUUID } from "uncrypto";

import { getEmailTemplate } from "~/utils/emailTemplate";

const TOKEN_TTL_MS = 10 * 60 * 1000;
const COOL_DOWN_MS = 2 * 60 * 1000;

export default defineEventHandler(async (event) => {
  try {
    const { db } = useDB();

    const runtimeConfig = useRuntimeConfig(event);

    const body = await readValidatedBody(event, body =>
      verifyEmailSchema.safeParse(body));

    if (!body.success) throw body.error.issues;

    const { email } = body.data;

    const normalizedEmail = email.trim().toLowerCase();

    const { getUserByEmail } = await userQueries();

    const existingUser = await getUserByEmail(normalizedEmail);

    if (!existingUser) return { success: true, message: "If an account exists, a verification email has been sent." };

    if (existingUser.emailVerified) {
      throw createError({
        statusCode: 400,
        message: "Your email is already verified. Please log in.",
      });
    }

    if (existingUser.verificationTokenExpiresAt) {
      const expiresAt = new Date(existingUser.verificationTokenExpiresAt);
      const tokenCreatedAt = new Date(expiresAt.getTime() - TOKEN_TTL_MS);

      const now = Date.now();
      const elapsedSinceTokenCreated = now - tokenCreatedAt.getTime();

      if (elapsedSinceTokenCreated < COOL_DOWN_MS) {
        const remainingMs = COOL_DOWN_MS - elapsedSinceTokenCreated;
        const remainingSec = Math.ceil(remainingMs / 1000);

        const message = remainingSec < 60
          ? `Please wait ${remainingSec} seconds before requesting another verification email.`
          : `Please wait ${Math.ceil(remainingSec / 60)} minutes before requesting another verification email.`;

        throw createError({
          statusCode: 429,
          message,
        });
      }
    }

    const verificationToken = randomUUID();
    const hashedVerificationToken = await hash(verificationToken);
    const tokenExpiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    // Update user with new token
    await db.update(user).set({
      verificationToken: hashedVerificationToken,
      verificationTokenExpiresAt: tokenExpiresAt,
    }).where(eq(user.id, existingUser.id));

    let siteUrl: string;

    if (import.meta.dev) siteUrl = getRequestURL(event).origin;
    else siteUrl = runtimeConfig.public.siteUrl;

    const verificationUrl = `${siteUrl}/auth/verifyEmail?token=${verificationToken}&id=${existingUser.id}`;

    const { htmlTemplate, textTemplate } = getEmailTemplate(verificationUrl, existingUser);

    if (import.meta.dev) {
      const { sendMail } = useNodeMailer();

      await sendMail({
        to: normalizedEmail,
        subject: "Verify your email address - Kings Hostel Management",
        html: htmlTemplate,
        text: textTemplate,
      });
    }
    else {
      const mailer = await useWorkerMailer();

      await mailer.send({
        from: { name: runtimeConfig.emailFromName, email: runtimeConfig.emailFromEmail },
        to: { name: existingUser.name, email: existingUser.email },
        subject: "Verify your email address - Kings Hostel Management",
        html: htmlTemplate,
        text: textTemplate,
      });

      mailer.close();
    }

    return {
      success: true,
      message: "Verification email sent! Please check your inbox and spam folder.",
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Resend Verification Email", event);
  }
});
