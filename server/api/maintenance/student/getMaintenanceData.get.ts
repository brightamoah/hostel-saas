import { maintenanceQueries, userQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  const { user } = await requirePortalUserSession(event, {
    message: "Unauthorized Access: Please log in to continue.",
  });

  if (user.role !== "student") {
    throw createError({
      statusCode: 403,
      message: "Forbidden: This endpoint is only accessible to students.",
    });
  }

  try {
    const userId = user.id;

    const { getStudentByUserId } = await userQueries();
    const { getStudentMaintenanceRequests } = await maintenanceQueries();

    const student = await getStudentByUserId(userId);

    if (!student) {
      throw createError({
        statusCode: 404,
        message: "Student Not Found: Unable to retrieve student data.",
      });
    }

    const {
      requests,
      summary,
    } = await getStudentMaintenanceRequests(student.id);

    return {
      maintenanceRequests: requests,
      stats: summary,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Get Student Maintenance Data", event);
  }
});
