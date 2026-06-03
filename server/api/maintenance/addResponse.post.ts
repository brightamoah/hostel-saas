import { maintenanceQueries, userQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  const session = await requirePortalUserSession(event, {
    message: "Unauthorized Access: Please log in to continue.",
  });

  const { user } = session;

  try {
    const body = await readValidatedBody(event, body => maintenanceStatusResponseSchema.pick({ maintenanceId: true, responseText: true }).safeParse(body));

    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: `${body.error.issues
          .map(i => i.message)
          .join(", ")}`,
      });
    }

    const { responseText, maintenanceId } = body.data;

    const { addMaintenanceResponse, findMaintenanceRequestById } = await maintenanceQueries(event);
    const { getAdminByUserIdUnscoped, getStudentByUserId } = await userQueries(event);

    const request = await findMaintenanceRequestById(maintenanceId);

    if (!request) {
      throw createError({
        statusCode: 404,
        message: "Maintenance request not found.",
      });
    }

    let companyId: number;
    let auditContext: AuditContext;

    const admin = await getAdminByUserIdUnscoped(user.id, true);

    if (admin) {
      const scope = await adminSessionCheck(event);
      const superAdmin = isSuperAdmin(scope);
      const companyOwner = isCompanyOwner(scope);
      const canAccessRequest = superAdmin
        || companyOwner
        || admin.companyId === request.companyId
        || admin.hostelId === request.hostelId;

      if (!canAccessRequest) {
        throw createError({
          statusCode: 403,
          message: "You do not have permission to respond to requests for this hostel.",
        });
      }
      companyId = superAdmin ? request.companyId : admin.companyId!;

      auditContext = getAuditContext({
        kind: "admin",
        event,
        scope,
        target: {
          companyId: request.companyId,
          hostelId: request.hostelId,
        },
      });
    }
    else {
      const student = await getStudentByUserId(user.id);

      if (!student || student.id !== request.studentId) {
        throw createError({
          statusCode: 403,
          message: "You can only respond to your own maintenance requests.",
        });
      }
      companyId = student.companyId!;

      auditContext = getAuditContext({
        kind: "student",
        event,
        userId: user.id,
        companyId,
        hostelId: student.hostelId,
      });
    }

    if (request.companyId !== companyId) {
      throw createError({
        statusCode: 403,
        message: "You do not have permission to respond to this request.",
      });
    }

    if (request.status === "completed") {
      throw createError({
        statusCode: 400,
        message: "Cannot add a response to a resolved maintenance request.",
      });
    }

    const newResponse = await addMaintenanceResponse(
      maintenanceId,
      user.id,
      companyId,
      responseText,
      auditContext,
    );

    return {
      success: true,
      message: "Your response has been added successfully.",
      response: newResponse,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Add Maintenance Response", event);
  }
});
