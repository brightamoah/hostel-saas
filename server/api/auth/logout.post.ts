import { handleError } from "~~/server/utils/errorHandler";

export default defineEventHandler(async (event) => {
  try {
    await clearPortalUserSession(event);
    return sendRedirect(event, "/auth/login");
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "User Logout", event);
  }
});
