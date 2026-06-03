import { userQueries } from "~~/server/db/queries/user";
import { visitorQueries } from "~~/server/db/queries/visitor";

export default defineEventHandler(async (event) => {
  const scope = await adminSessionCheck(event);
  const { userId } = scope;

  try {
    const { getAdminByUserId } = await userQueries(event);
    const { getScopedVisitors, getVisitorStatusCount } = await visitorQueries(event);

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

    const [
      visitors,
      stats,
    ]
      = await Promise.all([
        getScopedVisitors(scope),
        getVisitorStatusCount(scope),
      ]);

    return {
      visitors,
      stats,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Get Visitor Data", event);
  }
});
