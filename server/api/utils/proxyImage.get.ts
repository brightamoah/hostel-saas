import { Buffer } from "node:buffer";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const url = query.url as string;
  if (!url) {
    throw createError({ statusCode: 400, statusMessage: "Missing url" });
  }

  try {
    const response = await $fetch(url, { responseType: "arrayBuffer" });
    const buffer = Buffer.from(response as ArrayBuffer);

    // Determine content type roughly based on extension, though base64 in jsPDF is flexible.
    const ext = url.split(".").pop()?.toLowerCase();
    const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";

    return { data: `data:${mime};base64,${buffer.toString("base64")}` };
  }
  catch (error) {
    console.error("Image proxy error:", error);
    throw createError({ statusCode: 500, statusMessage: "Failed to fetch image" });
  }
});
