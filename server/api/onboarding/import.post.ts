import { importData } from "~~/server/services/onboarding/importData";

export default defineEventHandler(async (event) => {
  const scope = await adminSessionCheck(event);
  requireCompanyRole(scope, ["owner", "admin"]);

  const body = await readBody(event);
  const { uploadId } = body;

  if (!uploadId) {
    throw createError({
      statusCode: 400,
      message: "uploadId is required",
    });
  }

  const kv = useStorage("kv");
  const detailsKey = `onboarding:details:${uploadId}`;
  const historyKey = `onboarding:history:${scope.companyId}`;

  const existingHistory = await kv.getItem<any[]>(historyKey) || [];
  const ownsUpload = existingHistory.some(h => h.id === uploadId);

  if (!ownsUpload) {
    throw createError({
      statusCode: 403,
      message: "Unauthorized: Upload ID does not belong to your company",
    });
  }

  const cachedData = await kv.getItem(detailsKey);

  if (!cachedData) {
    throw createError({
      statusCode: 404,
      message: "Upload session expired or not found. Please re-upload your file.",
    });
  }

  const typedData = cachedData as Record<string, { valid: any[]; updated: any[] }>;

  try {
    await importData(scope.companyId!, typedData);

    const existingHistory = await kv.getItem<any[]>(historyKey) || [];
    const historyIndex = existingHistory.findIndex(h => h.id === uploadId);

    if (historyIndex !== -1) {
      existingHistory[historyIndex].status = "completed";
      await kv.setItem(historyKey, existingHistory);
    }

    return {
      success: true,
      message: "Data imported successfully",
    };
  }
  catch (error: any) {
    try {
      const kv = useStorage("kv");
      const existingHistory = await kv.getItem<any[]>(`onboarding:history:${scope.companyId}`) || [];
      const historyIndex = existingHistory.findIndex(h => h.id === uploadId);

      if (historyIndex !== -1) {
        existingHistory[historyIndex].status = "failed";
        await kv.setItem(`onboarding:history:${scope.companyId}`, existingHistory);
      }
    }
    catch {
      // ignore
    }

    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "Import Onboarding Data", event);
  }
});
