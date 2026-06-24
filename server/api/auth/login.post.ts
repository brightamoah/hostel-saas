import type { User } from "#auth-utils";

import { authHandoffQueries, roomQueries } from "~~/server/db/queries";
import { companyQueries } from "~~/server/db/queries/company";
import { userQueries } from "~~/server/db/queries/user";
import { handleError } from "~~/server/utils/errorHandler";
import { getPortalBaseUrls } from "~~/server/utils/portalUrls";

export default defineEventHandler(async (event): Promise<AuthLoginResponse> => {
  try {
    const surface = getSurface(event);
    const { siteBase, adminBase } = getPortalBaseUrls(event);

    await clearPortalUserSession(event);

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
      getAdminByUserIdUnscoped,
      recordLoginAttempt,
    } = await userQueries(event);

    const { checkActiveOrPendingAllocation } = await roomQueries(event);

    const { getUserMembershipByUserId } = await companyQueries(event);

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

    await checkUserLockedOutByIp(ip, event);

    const currentUser = await getUserByEmail(normalizedEmail);

    if (!currentUser) {
      await recordLoginAttempt(null, ip);
      throw createError({
        statusCode: 401,
        message: "Invalid email or password: please try again.",
      });
    }

    await checkUserLockOutByUserId(currentUser.id, ip, event);

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
      return {
        success: false,
        code: "UNVERIFIED_EMAIL",
        message: "Your email is not verified. Please verify your email to continue.",
        nextUrl: `${siteBase}/auth/login?error=UNVERIFIED_EMAIL`,
      };
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
      const { createHandoffToken } = await authHandoffQueries(event);

      const { token } = await createHandoffToken(currentUser.id);

      await recordLoginAttempt(currentUser.id, ip, true);

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
    let hasActiveAllocation = false;

    if (currentUser.role === "admin") {
      adminData = await getAdminByUserIdUnscoped(currentUser.id, true);

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

      if (existingStudent) {
        studentId = existingStudent.id;
        isOnboarded = true;
        companyId = existingStudent.companyId;

        const allocation = await checkActiveOrPendingAllocation(existingStudent.id);

        hasActiveAllocation = !!allocation;
      }
    }

    await recordLoginAttempt(
      currentUser.id,
      ip,
      true,
    );

    const now = new Date();

    const sessionDurationMs = rememberMe
      ? 1000 * 60 * 60 * 24 * 7
      : 1000 * 60 * 60; // 1 hour

    const expiresAt = new Date(now.getTime() + sessionDurationMs);

    await setPortalUserSession(event, {
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
      hasActiveAllocation,
      selectedHostelId: null,
      selectedHostelSlug: null,
      portal: surface,
      sessionDurationMs,
    });

    await updateUserLastLogin(currentUser.id);

    return {
      success: true,
      message: `Login successful. Redirecting....`,
      nextUrl: "/auth/login",
      code: "LOGIN_SUCCESS",
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "User Login", event);
  }
});
