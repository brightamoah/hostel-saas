import z from "zod";

export default defineEventHandler(async (event) => {
  const scope = await adminSessionCheck(event);
  requireCompanyRole(scope, ["owner", "admin"]);

  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({
      statusCode: 400,
      message: "id is required",
    });
  }

  // Ensure id is a string/UUID (not a number)
  const validatedId = z.uuid({ version: "v4" }).parse(id);

  const query = getQuery(event);
  const rawCompanyId = scope.companyId ?? (query.companyId ? Number(query.companyId) : null);

  if (scope.isPlatformAdmin && !rawCompanyId) {
    throw createError({ statusCode: 400, message: "companyId query parameter is required for platform admins" });
  }

  const kv = useStorage("kv");

  // Ensure the company owns this upload by checking their history
  const historyKey = `onboarding:history:${rawCompanyId}`;
  const companyHistory = await kv.getItem<any[]>(historyKey) || [];
  const ownsUpload = companyHistory.some(item => item.id === validatedId);

  if (!ownsUpload) {
    throw createError({
      statusCode: 403,
      message: "You are not authorized to access this resource or it does not exist.",
    });
  }

  const detailKey = `onboarding:details:${validatedId}`;

  const details = await kv.getItem(detailKey);

  if (!details) {
    throw createError({
      statusCode: 404,
      message: "Upload details not found.",
    });
  }

  return {
    success: true,
    details,
  };
});
