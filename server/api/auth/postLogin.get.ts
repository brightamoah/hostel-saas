import type { PostLoginResponse } from "~~/shared/types";

import { roomQueries, userQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event): Promise<PostLoginResponse> => {
  try {
    const { user } = await requireUserSession(event, {
      message: "User not authenticated",
    });

    if (user.role === "admin") {
      return {
        success: true,
        nextUrl: "/admin/dashboard" as const,
      };
    }

    const { getOnboardedStudent } = await userQueries();
    const { checkActiveOrPendingAllocation } = await roomQueries();

    const onboardedStudent = await getOnboardedStudent(user.id);

    if (!onboardedStudent) {
      return {
        success: true,
        nextUrl: "/auth/onboarding" as const,
      };
    }

    const activeAllocation = await checkActiveOrPendingAllocation(onboardedStudent.id);

    if (activeAllocation) {
      return {
        success: true,
        nextUrl: "/student/dashboard" as const,
      };
    }

    return {
      success: true,
      nextUrl: "/auth/hostelHub" as const,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "Post Login Routing", event);
  }
});
