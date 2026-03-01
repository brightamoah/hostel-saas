import type { User } from "#auth-utils";

import { userQueries } from "~~/server/db/queries";
import { companyQueries } from "~~/server/db/queries/company";
import { handleError } from "~~/server/utils/errorHandler";

export default defineEventHandler(async (event) => {
  try {
    const {
      user,
      expiresAt,
      onboarded,
      loggedInAt,
    } = await requireUserSession(event, {
      message: "User not authenticated",
    });

    const userId = user.id;

    const {
      getUserById,
      getAdminByUserId,
      getOnboardedStudent,
    } = await userQueries();

    const { getUserMembershipByUserId } = await companyQueries();

    const freshUser = await getUserById(userId);

    if (!freshUser) {
      throw createError({
        statusCode: 404,
        message: "User not found",
      });
    }

    let adminData: User["adminData"] | null = null;
    let studentId: number | undefined;
    let companyId: number | null = null;
    let companyRole: User["companyRole"] = null;

    if (freshUser.role === "admin") {
      adminData = await getAdminByUserId(freshUser.id, true);

      if (!adminData) {
        throw createError({
          statusCode: 403,
          message: "Admin details not found. Please contact support.",
        });
      }

      if (adminData.accessLevel !== "super") {
        const memberShip = await getUserMembershipByUserId(freshUser.id);

        if (memberShip?.status === "active") {
          companyId = memberShip.companyId;
          companyRole = memberShip.role;
        }
      }
    }
    else {
      const existingStudent = await getOnboardedStudent(freshUser.id);

      studentId = existingStudent?.id;
    }

    await setUserSession(event, {
      user: {
        id: freshUser.id,
        email: freshUser.email,
        role: freshUser.role,
        image: freshUser.image,
        name: freshUser.name,
        emailVerified: freshUser.emailVerified,
        createdAt: freshUser.createdAt,
        updatedAt: freshUser.updatedAt,
        lastLogin: freshUser.lastLogin,
        adminData,
        studentId,
        companyId,
        companyRole,
      } as User,
      loggedInAt,
      expiresAt,
      onboarded,
    });

    return { success: true, message: "Session refreshed" };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Refresh Session", event);
  }
});
