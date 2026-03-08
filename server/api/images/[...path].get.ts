export default defineEventHandler(async (event) => {
  try {
    const rawPath = getRouterParam(event, "path");

    if (!rawPath || typeof rawPath !== "string") {
      throw createError({
        statusCode: 400,
        message: "Invalid image path",
      });
    }

    const path = rawPath.replace(/\.\./g, "").replace(/^\/+/, "");

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

    setHeader(event, "Cache-Control", "public, max-age=31536000, immutable");

    if (import.meta.dev) {
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
      setHeader(event, "Content-Type", contentType);

      return data;
    }
    else {
      const r2Bucket = event.context.cloudflare?.env?.BUCKET;

      if (!r2Bucket) {
        throw createError({
          statusCode: 500,
          message: "R2 bucket not configured",
        });
      }

      const image = await r2Bucket.get(path);

      if (!image) {
        throw createError({
          statusCode: 404,
          message: "Image not found",
        });
      }

      setHeader(event, "Content-Type", image.httpMetadata?.contentType || contentType);

      if (image.etag) {
        setHeader(event, "ETag", image.etag);
      }

      return image.body;
    }
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "Get Image", event);
  }
});
