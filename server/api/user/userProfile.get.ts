import { userQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  const { user } = await requirePortalUserSession(event, {
    message: "Unauthorized. Please log in to access this resource.",
  });

  try {
    const { getUserProfile } = await userQueries(event);
    const userProfile = await getUserProfile(user.id);

    return {
      success: true,
      data: userProfile,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Delete User Data", event);
  }
});
