export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { key } = body;

    if (!key || typeof key !== "string") {
      throw createError({
        statusCode: 400,
        message: "Invalid image key",
      });
    }

    if (import.meta.dev) {
      console.log("Deleting image with key:", key);

      const storage = useStorage("images");

      const fileExists = await storage.hasItem(key);

      if (!fileExists) {
        throw createError({
          statusCode: 404,
          message: "Image not found",
        });
      }

      await storage.del(key);
    }
    else {
      console.log("Deleting image in prod", key);

      const storage = event.context.cloudflare.env.R2;
      const fileExists = await storage.get(key);

      if (!fileExists) {
        throw createError({
          statusCode: 404,
          message: "Image not found",
        });
      }

      await storage.delete(key);
    }

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
