defineRouteMeta({
  openAPI: {
    summary: "Serve images from R2 or local storage in development",
    description: "This endpoint serves images stored in Cloudflare R2 in production and local storage during development. It handles caching and content type headers appropriately.",
    parameters: [
      {
        name: "path",
        in: "path",
        required: true,
        schema: { type: "string" },
        description: "The path to the image, relative to the root of the storage. Example: 'avatars/user123.jpg'",
      },
    ],
    responses: {
      200: { description: "The requested image file" },
      400: { description: "Invalid image path" },
      404: { description: "Image not found" },
      500: { description: "Server error or R2 bucket not configured" },
    },
  },
});

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

    if (!path) {
      throw createError({
        statusCode: 400,
        message: "Invalid image path",
      });
    }

    const extension = path.split(".").pop()?.toLowerCase() || "jpg";

    const contentTypes: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
    };

    const contentType = contentTypes[extension] || "application/octet-stream";

    setHeader(event, "Cache-Control", "public, max-age=31536000, immutable");

    if (import.meta.dev) {
      const storage = useStorage("images");
      const data = await storage.getItemRaw(path);

      if (!data) {
        throw createError({ statusCode: 404, message: `Dev: Image not found ${path}` });
      }

      setHeader(event, "Content-Type", contentType);
      return data instanceof ArrayBuffer ? new Uint8Array(data) : data;
    }

    const r2Bucket = event.context?.cloudflare?.env?.BUCKET;

    if (!r2Bucket) {
      throw createError({
        statusCode: 500,
        message: "R2 bucket binding 'BUCKET' not found in production environment.",
      });
    }

    const image = await r2Bucket.get(path);

    if (!image) {
      throw createError({
        statusCode: 404,
        message: `R2: Image not found at key: ${path}`,
      });
    }

    setHeader(event, "Content-Type", image.httpMetadata?.contentType || contentType);

    return image.body;
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "Get Image", event);
  }
});
