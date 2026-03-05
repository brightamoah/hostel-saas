export default defineEventHandler(async (event) => {
  try {
    // await requireUserSession(event, {
    //   message: "Unauthorized, please log in to delete images.",
    // });

    const body = await readBody(event);
    const { key } = body;

    if (!key || typeof key !== "string") {
      throw createError({
        statusCode: 400,
        message: "Invalid image key",
      });
    }

    const storage = useStorage("images");
    const fileExists = await storage.hasItem(key);

    if (!fileExists) {
      throw createError({
        statusCode: 404,
        message: "Image not found",
      });
    }

    await storage.removeItem(key);

    return {
      success: true,
      message: "Image deleted successfully.",
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "Delete Image", event);
  }
});
