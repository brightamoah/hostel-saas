import type { User } from "#auth-utils";
import type { AuthLoginResponse } from "~~/shared/types";

import { authHandoffQueries } from "~~/server/db/queries";
import { companyQueries } from "~~/server/db/queries/company";
import { userQueries } from "~~/server/db/queries/user";
import { handleError } from "~~/server/utils/errorHandler";
import { getPortalBaseUrls } from "~~/server/utils/portalUrls";

export default defineEventHandler(async (event): Promise<AuthLoginResponse> => {
  try {
    const surface = getSurface(event);
    const { siteBase, adminBase } = getPortalBaseUrls(event);

    const rawIp = getIP(event);
    const ip = normalizeIp(rawIp);

    if (!ip || ip === "undefined") {
      throw createError({
        statusCode: 400,
        message: "Invalid request",
      });
    }

    const {
      updateUserLastLogin,
      getOnboardedStudent,
      getUserByEmail,
      getAdminByUserId,
      recordLoginAttempt,
    } = await userQueries();

    const { getUserMembershipByUserId } = await companyQueries();

    const body = await readValidatedBody(event, body => loginSchema.safeParse(body));

    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: `Invalid request: ${body.error.issues
          .map(i => i.message)
          .join(", ")}`,
      });
    }

    const { email, password, rememberMe } = body.data;

    const normalizedEmail = email.trim().toLowerCase();

    await checkUserLockedOutByIp(ip);

    const currentUser = await getUserByEmail(normalizedEmail);

    if (!currentUser) {
      await recordLoginAttempt(null, ip);
      throw createError({
        statusCode: 401,
        message: "Invalid email or password: please try again.",
      });
    }

    await checkUserLockOutByUserId(currentUser.id, ip);

    const isValid = await verifyHashedValue(currentUser.password, password);

    if (!isValid) {
      await recordLoginAttempt(currentUser.id, ip);
      throw createError({
        statusCode: 401,
        message: "Invalid email or password",
      });
    }

    if (!currentUser.emailVerified) {
      await recordLoginAttempt(currentUser.id, ip);
      throw createError({
        statusCode: 403,
        message: "Email not verified",
      });
    }

    if (surface === "admin" && currentUser.role !== "admin") {
      return {
        success: false,
        code: "WRONG_PORTAL",
        message: "You are trying to log in to the admin portal, but your account is a student account. Please log in on the student app.",
        nextUrl: `${siteBase}/auth/login`,
      };
    }

    if (surface === "public" && currentUser.role === "admin") {
      const { createHandoffToken } = await authHandoffQueries();
      const { token } = await createHandoffToken(currentUser.id);

      await recordLoginAttempt(currentUser.id, ip);

      return {
        success: true,
        code: "ADMIN_LOGIN",
        message: "Login successful. Redirecting to admin dashboard...",
        nextUrl: `${adminBase}/auth/handoff?token=${encodeURIComponent(token)}`,
      };
    }

    let adminData: User["adminData"] | null = null;
    let companyId: number | null = null;
    let companyRole: User["companyRole"] | null = null;

    let isOnboarded = false;
    let studentId: number | undefined;

    if (currentUser.role === "admin") {
      adminData = await getAdminByUserId(currentUser.id, true);

      if (!adminData) {
        throw createError({
          statusCode: 403,
          message: "Admin details not found. Please contact support.",
        });
      }

      if (adminData.accessLevel !== "super") {
        const memberShip = await getUserMembershipByUserId(currentUser.id);

        if (!memberShip || memberShip.status !== "active") {
          throw createError({
            statusCode: 403,
            message: "Company admin access is not active. Please contact your company administrator.",
          });
        }

        companyId = memberShip.companyId;
        companyRole = memberShip.role;
      }
    }
    else {
      const existingStudent = await getOnboardedStudent(currentUser.id);

      isOnboarded = !!existingStudent;
      studentId = existingStudent?.id;
    }

    await recordLoginAttempt(
      currentUser.id,
      ip,
      true,
    );

    const now = new Date();

    const sessionDurationMs = 1000 * 60 * 60 * 24 * 1;
    const expiresAt = new Date(now.getTime() + sessionDurationMs);

    await setUserSession(event, {
      user: {
        id: currentUser.id,
        email: currentUser.email,
        role: currentUser.role,
        image: currentUser.image,
        name: currentUser.name,
        emailVerified: currentUser.emailVerified,
        updatedAt: currentUser.updatedAt,
        lastLogin: currentUser.lastLogin,
        adminData,
        studentId,
        companyId,
        companyRole,
      } as User,
      loggedInAt: now,
      expiresAt,
      onboarded: isOnboarded,
    });

    if (rememberMe) {
      const extendedExpiresAt = new Date(now.getTime() + (1000 * 60 * 60 * 24 * 7));
      await replaceUserSession(event, {
        ...await getUserSession(event),
        expiresAt: extendedExpiresAt,
      });
    }

    await updateUserLastLogin(currentUser.id);

    const userRole = currentUser.role;
    const isAdmin = userRole === "admin";

    return {
      success: true,
      message: `Login successful. Redirecting to your ${isAdmin ? "admin" : "student"} dashboard`,
      nextUrl: isAdmin ? adminBase : siteBase,
      code: "LOGIN_SUCCESS",
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "User Login", event);
  }
});
