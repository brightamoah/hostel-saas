import { complaintQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  const { companyId } = await studentSessionCheck(event);

  try {
    const body = await readValidatedBody(event, body => createComplaintSchema.safeParse(body));

    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: `${body.error.issues
          .map(i => i.message)
          .join(", ")}`,
      });
    }

    if (!companyId) {
      throw createError({
        statusCode: 403,
        message: "You do not have permission to create complaints. Please contact support if you believe this is an error.",
      });
    }

    const { priority, ...rest } = body.data;

    const { createComplaint } = await complaintQueries();

    const result = await createComplaint({
      priority,
      ...rest,
      companyId,
    });

    if (!result) {
      throw createError({
        statusCode: 500,
        message: "Failed to create complaint. Please try again later.",
      });
    }

    const { id, createdAt, status } = result;

    return {
      success: true,
      message: "New Complaint created successfully",
      data: {
        id,
        createdAt,
        status,
      },
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Create New Complaint", event);
  }
});
