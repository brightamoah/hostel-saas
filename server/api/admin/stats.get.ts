import { statsQueries } from "~~/server/db/queries/stats";

export default defineEventHandler(async (event) => {
  const {
    adminData,
    companyId,
    companyRole,
    isPlatformAdmin,
  } = await adminSessionCheck(event);

  try {
    const {
      getDashboardOverview,
      getCardStats,
    } = await statsQueries();

    const overview = await getDashboardOverview({
      ...adminData,
      companyId,
      companyRole,
      isPlatformAdmin,
    });

    const cardStats = await getCardStats({
      companyId,
      hostelId: adminData.hostelId,
      isPlatformAdmin,
      companyRole,
    });

    return {
      overview,
      cardStats,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Admin Stats", event);
  }
});
