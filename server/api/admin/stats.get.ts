import { statsQueries } from "~~/server/db/queries/stats";

defineRouteMeta({
  openAPI: {
    summary: "Get admin dashboard statistics",
    tags: ["Admin", "Stats"],
    responses: {
      200: {
        description: "Dashboard overview and card statistics",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                overview: { type: "object" },
                cardStats: { type: "object" },
              },
            },
          },
        },
      },
    },
  },
});

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
    } = await statsQueries(event);

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
