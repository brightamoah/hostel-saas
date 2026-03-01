import { companyQueries } from "~~/server/db/queries/company";
import { randomUUID } from "uncrypto";

import { getEmailTemplate } from "~/utils/emailTemplate";

export default defineEventHandler(async (event) => {
  try {
    const runtimeConfig = useRuntimeConfig(event);

    const body = await readValidatedBody(event, body => registerCompanySchema.safeParse(body));

    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: `Invalid request: ${body.error.issues
          .map(i => i.message)
          .join(", ")}`,
      });
    }

    const {
      companyName,
      email,
      name,
      password,
      supportEmail,
      supportPhone,
      companySlug,
      createHostelNow,
      hostelName,
      hostelSlug,
      confirmPassword,
      phoneNumber,
      hostelAddress,
    } = body.data;

    if (password !== confirmPassword) {
      throw createError({
        statusCode: 400,
        message: "Password and confirm password do not match",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedSupportEmail = supportEmail?.trim().toLowerCase();

    const hashedPassword = await hash(password);
    const hashedConfirmPassword = await hash(confirmPassword);

    const verificationToken = randomUUID();
    const hashedVerificationToken = await hash(verificationToken);

    const verificationTokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const { registerCompanyOwner } = await companyQueries();

    const newCompanyOwner = await registerCompanyOwner({
      companyName,
      companySlug,
      email: normalizedEmail,
      name,
      password: hashedPassword,
      confirmPassword: hashedConfirmPassword,
      createHostelNow,
      hostelName,
      hostelSlug,
      phoneNumber,
      supportEmail: normalizedSupportEmail,
      hostelAddress,
      supportPhone,
      verificationToken: hashedVerificationToken,
      verificationTokenExpiresAt,
    });

    if (!newCompanyOwner) {
      throw createError({
        statusCode: 500,
        message: "Failed to register company owner. Please try again.",
      });
    }

    let siteUrl: string;

    if (import.meta.dev) siteUrl = getRequestURL(event).origin;
    else siteUrl = runtimeConfig.public.siteUrl;

    const verificationUrl = `${siteUrl}/auth/verifyEmail?token=${verificationToken}&id=${newCompanyOwner.user.id}`;

    const { htmlTemplate, textTemplate } = getEmailTemplate(verificationUrl, newCompanyOwner.user);

    try {
      if (import.meta.dev) {
        const { sendMail } = useNodeMailer();

        await sendMail({
          to: email,
          subject: "Verify your email address - Kings Hostel Management",
          html: htmlTemplate,
          text: textTemplate,
        });
      }
      else {
        const mailer = await useWorkerMailer();

        await mailer.send({
          from: { name: runtimeConfig.emailFromName, email: runtimeConfig.emailFromEmail },
          to: { name: newCompanyOwner.user.name, email },
          subject: "Verify your email address - Kings Hostel Management",
          html: htmlTemplate,
          text: textTemplate,
        });

        if (typeof mailer.close === "function") mailer.close();
      }
    }
    catch (emailError) {
      console.error("Failed to send verification email:", emailError);
    }

    return {
      success: true,
      message: "Company and owner registered successfully. Please check your email for verification.",
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Register Company & Owner", event);
  }
});
