import { complaintQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  const { userId, companyId } = await studentSessionCheck(event);

  const idFromParam = Number(getRouterParam(event, "complaintId"));

  if (Number.isNaN(idFromParam) || idFromParam <= 0) {
    throw createError({
      statusCode: 400,
      message: "Invalid Request ID: The provided request ID is not valid.",
    });
  }

  if (!companyId) {
    throw createError({
      statusCode: 403,
      message: "You do not have permission to edit complaints. Please contact support if you believe this is an error.",
    });
  }

  try {
    const body = await readValidatedBody(event, body => editComplaintSchema.safeParse(body));

    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: body.error.issues.map(i => i.message).join(", "),
      });
    }

    const { complaintId, data, studentId } = body.data;

    if (complaintId !== idFromParam) {
      throw createError({
        statusCode: 400,
        message: "Complaint ID Mismatch: The complaint ID in the body does not match the URL parameter.",
      });
    }

    const { updateComplaint, getComplaintForStudentById } = await complaintQueries();

    const existingComplaint = await getComplaintForStudentById(complaintId, studentId);

    if (!existingComplaint) {
      throw createError({
        statusCode: 404,
        message: "Complaint not found or you do not have permission to edit this complaint.",
      });
    }

    const auditContext = getAuditContext({
      kind: "student",
      companyId,
      hostelId: existingComplaint.hostelId,
      userId,
      event,
    });

    const updatedComplaint = await updateComplaint(
      complaintId,
      studentId,
      data as Parameters<typeof updateComplaint>[2],
      auditContext,
    );

    if (!updatedComplaint) {
      throw createError({
        statusCode: 409,
        message: `Complaint cannot be updated in its current state: ${existingComplaint.status}`,
      });
    }

    return {
      success: true,
      message: `Complaint with ID ${updatedComplaint.id} updated successfully.`,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Update Complaint", event);
  }
});
