import { complaintQueries, userQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  const scope = await adminSessionCheck(event);

  const { userId } = scope;

  try {
    const body = await readValidatedBody(event, body => complaintStatusResponseSchema.safeParse(body));

    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: `${body.error.issues
          .map(i => i.message)
          .join(", ")}`,
      });
    }

    const { complaintId, status, responseText } = body.data;

    const { updateStatusAndAddResponse, getComplaintById } = await complaintQueries(event);
    const { getAdminByUserId } = await userQueries(event);

    const adminMakingRequest = await getAdminByUserId(
      userId,
      true,
      scope,
    );

    if (!adminMakingRequest) {
      throw createError({
        statusCode: 403,
        message: "Account for the admin making the request not found or is inactive.",
      });
    }

    const complaintToUpdate = await getComplaintById(complaintId, scope);

    if (!complaintToUpdate) {
      throw createError({
        statusCode: 404,
        message: "Complaint not found.",
      });
    }

    if (complaintToUpdate.status === "resolved") {
      throw createError({
        statusCode: 400,
        message: "Cannot update a resolved complaint.",
      });
    }

    if (status === complaintToUpdate.status) {
      throw createError({
        statusCode: 400,
        message: `The complaint is already marked as ${status}. Please choose a different status.`,
      });
    }

    const companyId = complaintToUpdate.companyId ?? adminMakingRequest.companyId;

    const newScope = {
      ...scope,
      companyId,
    };

    if (complaintToUpdate.companyId !== adminMakingRequest.companyId) {
      throw createError({
        statusCode: 403,
        message: "You do not have permission to update complaints for this company.",
      });
    }

    const auditContext = getAuditContext({
      kind: "admin",
      event,
      scope,
      target: {
        companyId: complaintToUpdate.companyId ?? companyId,
        hostelId: complaintToUpdate.hostelId,
      },
    });

    const { updatedComplaint, newResponse } = await updateStatusAndAddResponse(
      status,
      responseText,
      complaintId,
      newScope,
      auditContext,
    );

    return {
      success: true,
      message: "Complaint status and response updated successfully.",
      updatedComplaint,
      newResponse,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Add Maintenance Response", event);
  }
});
