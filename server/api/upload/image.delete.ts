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
      const storage = useStorage("images");

      const exists = await storage.hasItem(key);

      if (!exists) {
        throw createError({
          statusCode: 404,
          message: "Image not found",
        });
      }

      await storage.removeItem(key);
    }
    else {
      const r2Bucket = event.context.cloudflare?.env?.BUCKET;

      if (!r2Bucket) {
        throw createError({
          statusCode: 500,
          message: "R2 bucket not configured",
        });
      }

      const image = await r2Bucket.get(key);

      if (!image) {
        throw createError({
          statusCode: 404,
          message: "Image not found",
        });
      }

      await r2Bucket.delete(key);
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
