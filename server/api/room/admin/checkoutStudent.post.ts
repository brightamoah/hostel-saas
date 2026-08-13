import { roomQueries } from "~~/server/db/queries";
import { checkoutStudent } from "~~/shared/utils/schema";

export default defineEventHandler(async (event) => {
  try {
    const scope = await adminSessionCheck(event);

    const body = await readValidatedBody(event, body => checkoutStudent.safeParse(body));

    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: `Invalid request: ${body.error.issues
          .map(i => i.message)
          .join(", ")}`,
      });
    }

    const { hostelId, studentId, idempotencyKey, reason } = body.data;

    if (!hostelId) {
      throw createError({
        statusCode: 400,
        message: "hostelId is required.",
      });
    }

    const auditContext = getAuditContext({
      event,
      kind: "admin",
      scope,
      target: {
        companyId: scope.companyId,
        hostelId,
      },
    });

    const { resetHostelResidency } = await roomQueries(event);

    const result = await resetHostelResidency({
      hostelId: Number(hostelId),
      studentId: Number(studentId),
      idempotencyKey,
      triggerSource: "checkout",
      reason,
      triggeredByUserId: scope.userId,
      auditContext,
    });

    return {
      success: true,
      message: "Student checked out successfully.",
      data: result,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "Checkout Student", event);
  }
});
