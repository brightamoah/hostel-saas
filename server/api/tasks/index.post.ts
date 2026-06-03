export default defineEventHandler(async (event) => {
  const scope = await adminSessionCheck(event);

  try {
    if (!scope.isPlatformAdmin) {
      throw createError({
        statusCode: 403,
        statusMessage: "You do not have permission to perform this action",
      });
    }

    const { result } = await runTask("schedular");

    return result;
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "Manual Task Trigger", event);
  }
});
