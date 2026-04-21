export default defineEventHandler(async (event) => {
  const { user } = await requirePortalUserSession(event, {
    message: "Unauthorized Access: Please log in to continue.",
  });

  if (user.role !== "student") {
    throw createError({
      statusCode: 403,
      message: "Forbidden: Students only.",
    });
  }

  try {
    let parts: NonNullable<Awaited<ReturnType<typeof readMultipartFormData>>> = [];
    try {
      parts = (await readMultipartFormData(event)) ?? [];
    }
    catch (e) {
      console.error("readMultipartFormData failed:", e);
      throw createError({ statusCode: 500, message: "Failed to parse upload." });
    }

    const files = parts.filter(p => p.name === "files");

    if (!files.length) {
      throw createError({
        statusCode: 400,
        message: "No files uploaded.",
      });
    }

    const attachments = await uploadMedia(files.map(f => ({
      data: f.data,
      type: f.type!,
      filename: f.filename,
    })), {
      folder: "maintenance",
      entityId: user.id,
    });

    return {
      success: true,
      attachments,
    };
  }
  catch (error) {
    console.error("Media Upload Error:", error);
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "Maintenance Media Upload", event);
  }
});
