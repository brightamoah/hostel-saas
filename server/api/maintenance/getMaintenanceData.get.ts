import { maintenanceQueries, userQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  const scope = await adminSessionCheck(event);
  const { userId } = scope;
  try {
    const { getAdminByUserId } = await userQueries(event);
    const { getAllMaintenanceRequests, getMaintenanceStatusCount } = await maintenanceQueries(event);

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

    const maintenanceRequests = await getAllMaintenanceRequests(scope);

    const stats = await getMaintenanceStatusCount(scope);

    return {
      maintenanceRequests,
      stats,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Get Maintenance Data", event);
  }
});
