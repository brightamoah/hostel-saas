import { Buffer } from "node:buffer";

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
      gif: "image/gif",
      svg: "image/svg+xml",
    };

    const contentType = contentTypes[extension] || "application/octet-stream";

    setHeader(event, "Cache-Control", "public, max-age=31536000, immutable");

    const storage = useStorage("images");

    const data = await storage.getItemRaw(path);

    if (!data) {
      throw createError({
        statusCode: 404,
        message: `Image not found ${path}`,
      });
    }
    setHeader(event, "Content-Type", contentType);

    if (data instanceof ArrayBuffer) {
      return new Uint8Array(data);
    }

    if (data instanceof Uint8Array) {
      return data;
    }

    if (Buffer.isBuffer(data)) {
      return data;
    }

    // If it's a readable stream
    if (data && typeof data === "object" && "pipe" in data) {
      return sendStream(event, data as ReadableStream<any>);
    }

    return data;
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "Get Image", event);
  }
});
