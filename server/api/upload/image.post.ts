/* eslint-disable no-console */
import { randomUUID } from "uncrypto";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export default defineEventHandler(async (event) => {
  try {
    const formData = await readMultipartFormData(event);

    if (!formData || formData.length === 0) {
      throw createError({
        statusCode: 400,
        message: "No file uploaded",
      });
    }

    const fileField = formData.find(f => f.name === "file");
    const folderField = formData.find(f => f.name === "folder");

    if (!fileField || !fileField.data) {
      throw createError({
        statusCode: 400,
        message: "No file found in upload",
      });
    }

    const mimeType = fileField.type || "";
    const folder = folderField?.data.toString() || "uploads";

    if (!ALLOWED_TYPES.includes(mimeType)) {
      throw createError({
        statusCode: 400,
        message: "Invalid file type. Allowed types: JPEG, JPG, PNG, WEBP",
      });
    }

    if (fileField.data.length > MAX_FILE_SIZE) {
      throw createError({
        statusCode: 400,
        message: "File too large. Maximum size is 2MB",
      });
    }

    const extension = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
    const filename = `${randomUUID()}.${extension}`;
    const key = `${folder}/${filename}`;

    console.log("Uploading file with key:", key);

    if (import.meta.dev) {
      const storage = useStorage("images");

      await storage.setItemRaw(key, fileField.data, {
        httpMetadata: {
          contentType: mimeType,
        },
      });
    }
    else {
      const r2Bucket = event.context.cloudflare?.env?.BUCKET;

      if (!r2Bucket) {
        throw createError({
          statusCode: 500,
          message: "R2 bucket not configured",
        });
      }

      await r2Bucket.put(key, fileField.data, {
        httpMetadata: {
          contentType: mimeType,
        },
      });
    }

    return {
      success: true,
      message: "File uploaded successfully",
      url: `/api/_images/${key}`,
      key,
      filename,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "Image Upload", event);
  }
});
