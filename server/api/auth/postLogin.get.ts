import type { PostLoginResponse } from "~~/shared/types";

export default defineEventHandler(async (event): Promise<PostLoginResponse> => {
  try {
    const {
      user,
      onboarded,
      hasActiveAllocation,
    } = await requireUserSession(event, {
      message: "User not authenticated",
    });

    if (user.role === "admin") {
      return {
        success: true,
        nextUrl: "/admin/dashboard",
      };
    }

    if (!onboarded) {
      return {
        success: true,
        nextUrl: "/auth/onboarding",
      };
    }

    if (!hasActiveAllocation) {
      return {
        success: true,
        nextUrl: "/auth/hostelHub",
      };
    }

    return {
      success: true,
      nextUrl: "/student/dashboard",
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "Post Login Routing", event);
  }
});
