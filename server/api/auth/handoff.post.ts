import type { User } from "#auth-utils";

import { authHandoffQueries, companyQueries, userQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  try {
    await clearUserSession(event);

    const body = await readBody(event);
    const token = body?.token;

    if (!token || typeof token !== "string") {
      throw createError({
        statusCode: 400,
        message: "token is required",
      });
    }

    const { consumeHandoffToken } = await authHandoffQueries();
    const consumed = await consumeHandoffToken(token);

    if (!consumed) {
      throw createError({
        statusCode: 400,
        message: "Invalid or expired token",
      });
    }

    const { getUserById, getAdminByUserId } = await userQueries();
    const currentUser = await getUserById(consumed.userId);

    if (!currentUser || currentUser.role !== "admin") {
      throw createError({
        statusCode: 403,
        message: "Not an admin user",
      });
    }

    const adminData = await getAdminByUserId(currentUser.id, true);
    if (!adminData) {
      throw createError({
        statusCode: 403,
        message: "Admin details not found",
      });
    }

    let companyId: number | null = null;
    let companyRole: User["companyRole"] = null;

    const { getUserMembershipByUserId } = await companyQueries();

    if (adminData.accessLevel !== "super") {
      const membership = await getUserMembershipByUserId(currentUser.id);

      if (!membership || membership.status !== "active") {
        throw createError({
          statusCode: 403,
          message: "No active company membership found",
        });
      }

      companyId = membership.companyId;
      companyRole = membership.role;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 1);

    await setUserSession(event, {
      user: {
        id: currentUser.id,
        email: currentUser.email,
        role: currentUser.role,
        image: currentUser.image,
        name: currentUser.name,
        emailVerified: currentUser.emailVerified,
        createdAt: currentUser.createdAt,
        updatedAt: currentUser.updatedAt,
        lastLogin: currentUser.lastLogin,
        adminData,
        companyId: companyId!,
        companyRole,
      },
      loggedInAt: now,
      expiresAt,
      onboarded: true,
      portal: "admin",
    });

    return { success: true, nextUrl: "/admin/dashboard" };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Auth Handoff", event);
  }
});
