import { maintenanceQueries, userQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  const { userId, companyId, user } = await studentSessionCheck(event);

  if (user.role !== "student") {
    throw createError({
      statusCode: 403,
      message: "Forbidden: This endpoint is only accessible to students.",
    });
  }

  if (!companyId) {
    throw createError({
      statusCode: 403,
      message: "You do not have permission to create maintenance requests. Please contact support if you believe this is an error.",
    });
  }

  try {
    const body = await readValidatedBody(event, body =>
      apiCreateMaintenanceSchema.safeParse(body));

    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: body.error.issues.map(i => i.message).join(", "),
      });
    }

    const {
      studentId,
      description,
      hostelId,
      issueType,
      priority,
      roomId,
      mediaAttachments,
    } = body.data;

    const { getStudentForDashboardByUserId } = await userQueries(event);
    const { createMaintenance } = await maintenanceQueries(event);

    const studentData = await getStudentForDashboardByUserId(user.id);

    if (!studentData) {
      throw createError({
        statusCode: 404,
        message: "Student Not Found: Unable to retrieve student data.",
      });
    }

    const student = studentData.studentRecordWithBestAllocation;

    if (studentId !== student.id) {
      throw createError({
        statusCode: 403,
        message: "You cannot create a request for another student.",
      });
    }

    if (!student.allocation || !student.allocation.room || !student.allocation.room.hostel) {
      throw createError({
        statusCode: 403,
        message: "Access denied: You must have an active room allocation to create a maintenance request.",
      });
    }

    if (student.allocation.status !== "active" || student.residencyStatus !== "active") {
      throw createError({
        statusCode: 403,
        message: "Access denied: Only active hostel residents can create a maintenance request.",
      });
    }

    const auditContext = getAuditContext({
      kind: "student",
      event,
      userId,
      companyId,
      hostelId,
    });

    const result = await createMaintenance({
      studentId,
      description,
      hostelId,
      issueType,
      priority,
      roomId,
      companyId,
      mediaAttachments,
    }, auditContext);

    return {
      success: true,
      message: "Maintenance request created successfully.",
      data: result,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Create Maintenance", event);
  }
});
