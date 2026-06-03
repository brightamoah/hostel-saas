import { maintenanceQueries, userQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  const { userId } = await studentSessionCheck(event);

  try {
    const { getStudentByUserId } = await userQueries(event);
    const { getStudentMaintenanceRequests } = await maintenanceQueries(event);

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
