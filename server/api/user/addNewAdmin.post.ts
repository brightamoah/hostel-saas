import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { roomQueries } from "~~/server/db/queries";
import { userQueries } from "~~/server/db/queries/user";
import { admin, companyMember, user } from "~~/server/db/schema";
import { generateTempPassword } from "~~/server/utils/generateTemporaryPassword";
import { getEmailTemplate, getWelcomeAdminTemplate } from "~~/shared/utils/emailTemplate";
import { randomUUID } from "uncrypto";

export default defineEventHandler(async (event) => {
  const scope = await adminSessionCheck(event);

  const { userId, companyId } = scope;

  if (!companyId) {
    throw createError({
      statusCode: 400,
      message: "Your account is not associated with a company. Please contact support.",
    });
  }

  const { db } = useDB(event);
  const runtimeConfig = useRuntimeConfig();

  const { getAdminByUserId, checkIfUserExists } = await userQueries(event);

  const creatorAdminDetails = await getAdminByUserId(userId, true, scope);

  if (!creatorAdminDetails) {
    throw createError({
      statusCode: 403,
      message: "Could not verify creator's admin status.",
    });
  }

  const body = await readValidatedBody(event, b => addAdminSchema.safeParse(b));

  if (!body.success) {
    throw createError({
      statusCode: 400,
      message: body.error.issues.map(i => i.message).join(", "),
    });
  }

  const {
    name,
    email,
    phoneNumber,
    department,
    accessLevel,
    hostelId,
    role,
    companyRole,
  }
    = body.data;

  let assignedHostelId: number | null = null;
  let assignedCompanyId: number | null = null;

  if (creatorAdminDetails.accessLevel === "super") {
    assignedHostelId = hostelId ?? null;
    assignedCompanyId = companyId ?? null;
  }
  else {
    if (!creatorAdminDetails.hostelId) {
      throw createError({
        statusCode: 400,
        message: "As a regular admin, you must be assigned to a hostel to create new admins.",
      });
    }

    assignedHostelId = creatorAdminDetails.hostelId;
    assignedCompanyId = creatorAdminDetails.companyId;
  }

  if (accessLevel !== "super" && (!assignedHostelId || !assignedCompanyId)) {
    throw createError({
      statusCode: 400,
      message: "Regular and Support admins must be assigned to a hostel.",
    });
  }

  if (accessLevel === "super" && companyRole !== "owner") {
    throw createError({
      statusCode: 400,
      message: "Only platform admins (super) can have accessLevel 'super'; companyOwner must use regular access.",
    });
  }

  const existingUser = await checkIfUserExists(email);
  if (existingUser) {
    throw createError({
      statusCode: 409,
      message: "A user with this email already exists.",
    });
  }

  const generatedPassword = generateTempPassword();
  const passwordHash = await hash(generatedPassword);
  const verificationToken = randomUUID();
  const hashedVerificationToken = bytesToHex(sha256(utf8ToBytes(verificationToken)));

  if (!assignedHostelId) {
    throw createError({
      statusCode: 400,
      message: "A hostel assignment is required. Please provide a valid hostel ID.",
    });
  }

  const { getHostelByIdScoped } = await roomQueries(event);

  const hostel = await getHostelByIdScoped(assignedHostelId, scope);

  if (!hostel) {
    throw createError({
      statusCode: 400,
      message: "Assigned hostel not found. Please verify the hostel ID and try again.",
    });
  }
  try {
    const newAdminUser = await db.transaction(async (txn) => {
      const [newUser] = await txn
        .insert(user)
        .values({
          name,
          email,
          password: passwordHash,
          role,
          verificationToken: hashedVerificationToken,
          verificationTokenExpiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 mins from now
        })
        .returning();

      if (!newUser) {
        txn.rollback();
        throw createError({
          statusCode: 500,
          message: "Failed to create user record.",
        });
      }

      const [newAdmin] = await txn
        .insert(admin)
        .values({
          userId: newUser.id,
          phoneNumber,
          department,
          accessLevel,
          hostelId: assignedHostelId,
          companyId: assignedCompanyId,
        })
        .returning();

      if (!newAdmin) {
        txn.rollback();
        throw createError({
          statusCode: 500,
          message: "Failed to create admin record.",
        });
      }

      const [membership] = await txn
        .insert(companyMember)
        .values({
          userId: newUser.id,
          companyId,
          role: companyRole,
          status: "active",
        })
        .returning();

      if (!membership) {
        txn.rollback();
        throw createError({
          statusCode: 500,
          message: "Failed to create company membership record.",
        });
      }

      return {
        ...newUser,
        ...newAdmin,
        companyId,
        companyRole: membership.role,
      };
    });

    let siteUrl: string;

    if (import.meta.dev) siteUrl = getRequestURL(event).origin;
    else siteUrl = runtimeConfig.public.siteUrl ?? getRequestURL(event).origin;

    const verificationUrl = `${siteUrl}/auth/verifyEmail?token=${verificationToken}&id=${newAdminUser.userId}`;

    const userForEmail = { ...newAdminUser, companyId: newAdminUser.companyId ?? undefined };

    const { html, text } = getWelcomeAdminTemplate(
      name,
      email,
      generatedPassword,
      hostel.name!,
      runtimeConfig.public.adminBaseUrl,
    );

    const { htmlTemplate, textTemplate } = getEmailTemplate(verificationUrl, userForEmail, hostel.name!);

    if (import.meta.dev) {
      const { sendMail } = useNodeMailer();

      await sendMail({
        to: email,
        subject: "Your Kings Hostel Management Admin Account Details",
        html,
        text,
      });

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
        to: { name, email },
        subject: "Your Kings Hostel Management Admin Account Details",
        html,
        text,
      });

      await mailer.send({
        from: { name: runtimeConfig.emailFromName, email: runtimeConfig.emailFromEmail },
        to: { name, email },
        subject: "Verify your email address - Kings Hostel Management",
        html: htmlTemplate,
        text: textTemplate,
      });

      await mailer.close();
    }

    return {
      success: true,
      message: "Admin created successfully. Credentials and verification link sent to their email.",
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Add New Admin", event);
  }
});
