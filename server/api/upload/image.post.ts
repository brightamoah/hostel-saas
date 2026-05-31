const ALLOWED_PUBLIC_FOLDERS = [
  "company-registration",
  "registrations",
  "public-profiles",
  "onboarding-temp",
];

export default defineEventHandler(async (event) => {
  try {
    const { user } = await getPortalUserSession(event);

    let parts: NonNullable<Awaited<ReturnType<typeof readMultipartFormData>>> = [];
    try {
      parts = (await readMultipartFormData(event)) ?? [];
    }
    catch (e) {
      console.error("readMultipartFormData failed:", e);
      throw createError({
        statusCode: 500,
        message: "Failed to parse upload.",
      });
    }

    const files = parts.filter(p => p.name === "file" || p.name === "files");

    if (!files.length) {
      throw createError({
        statusCode: 400,
        message: "No file uploaded",
      });
    }

    const folderField = parts.find(f => f.name === "folder");

    const folder = folderField?.data.toString() || "uploads";

    const isPublicFolder = ALLOWED_PUBLIC_FOLDERS.includes(folder);

    if (!user && !isPublicFolder) {
      throw createError({
        statusCode: 401,
        message: "Unauthorized Access: Please log in to upload files here.",
      });
    }

    if (!user) {
      const totalSize = files.reduce((acc, f) => acc + f.data.length, 0);

      if (totalSize > 2 * 1024 * 1024) {
        throw createError({
          statusCode: 413,
          message: "Payload Too Large: Public uploads are restricted to a maximum of 2MB.",
        });
      }
    }

    const entityId = user ? (user.companyId || user.id) : "registration-anonymous";

    const attachments = await uploadMedia(event, files.map(f => ({
      data: f.data,
      type: f.type!,
      filename: f.filename,
    })), {
      folder,
      entityId,
      allowedMimeTypes: {
        "image/jpeg": "image",
        "image/jpg": "image",
        "image/png": "image",
        "image/webp": "image",
      },
    });

    if (!attachments.length) {
      throw createError({
        statusCode: 500,
        message: "Failed to upload image.",
      });
    }

    return {
      success: true,
      message: "File uploaded successfully",
      url: attachments[0]?.url,
      attachments,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "Image Upload", event);
  }
});
