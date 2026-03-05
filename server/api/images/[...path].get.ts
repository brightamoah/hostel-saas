export default defineEventHandler(async (event) => {
  try {
    const path = getRouterParam(event, "path");

    if (!path || typeof path !== "string") {
      throw createError({
        statusCode: 400,
        message: "Invalid image path",
      });
    }

    const storage = useStorage("images");
    const file = await storage.hasItem(path);

    if (!file) {
      throw createError({
        statusCode: 404,
        message: "Image not found",
      });
    }

    const data = await storage.getItemRaw(path);

    if (!data) {
      throw createError({
        statusCode: 404,
        message: "Image not found",
      });
    }

    const extension = path.split(".").pop()?.toLowerCase() || "jpg";

    const contentTypes: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
      svg: "image/svg+xml",
    };

    const contentType = contentTypes[extension] || "application/octet-stream";

    // Set cache headers
    setHeader(event, "Content-Type", contentType);
    setHeader(event, "Cache-Control", "public, max-age=31536000, immutable");

    return data;
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "Get Image", event);
  }
});
