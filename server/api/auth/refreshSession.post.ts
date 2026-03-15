import type { User } from "#auth-utils";

import { roomQueries, userQueries } from "~~/server/db/queries";
import { companyQueries } from "~~/server/db/queries/company";
import { handleError } from "~~/server/utils/errorHandler";

export default defineEventHandler(async (event) => {
  try {
    const {
      user,
      expiresAt,
      loggedInAt,
      selectedHostelId,
      selectedHostelSlug,
    } = await requirePortalUserSession(event, {
      message: "User not authenticated",
    });

    const userId = user.id;

    const surface = getSurface(event);

    const {
      getUserById,
      getAdminByUserId,
      getOnboardedStudent,
    } = await userQueries();

    const { getUserMembershipByUserId } = await companyQueries();
    const { checkActiveOrPendingAllocation } = await roomQueries();

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
    let onboarded = false;
    let hasActiveAllocation = false;

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

      if (existingStudent) {
        studentId = existingStudent.id;
        onboarded = true;
        companyId = existingStudent.companyId;

        const allocation = await checkActiveOrPendingAllocation(existingStudent.id);

        hasActiveAllocation = !!allocation;
      }
    }

    await setPortalUserSession(event, {
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
      hasActiveAllocation,
      selectedHostelId: selectedHostelId ?? null,
      selectedHostelSlug: selectedHostelSlug ?? null,
      portal: surface,
    });

    return { success: true, message: "Session refreshed" };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Refresh Session", event);
  }
});
