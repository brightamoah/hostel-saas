import { userQueries } from "~~/server/db/queries";
import { deleteMediaFile } from "~~/server/utils/r2Upload";

const ALLOWED_MIME_TYPES: Record<string, "image"> = {
  "image/jpeg": "image",
  "image/jpg": "image",
  "image/png": "image",
  "image/webp": "image",
};

export default defineEventHandler(async (event) => {
  try {
    const { user } = await requirePortalUserSession(event, {
      message: "Unauthorized access",
    });

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

    const file = parts.find(p => p.name === "file" || p.name === "image" || p.name === "files");

    if (!file || !file.data || !file.data.length) {
      throw createError({
        statusCode: 400,
        message: "No image file uploaded.",
      });
    }

    if (!file.type || !(file.type in ALLOWED_MIME_TYPES)) {
      throw createError({
        statusCode: 400,
        message: `Unsupported file type: ${file.type}. Allowed types are JPG, PNG, and WebP.`,
      });
    }

    if (file.data.length > 20 * 1024 * 1024) {
      throw createError({
        statusCode: 400,
        message: "Image file exceeds maximum 20MB limit.",
      });
    }

    const attachments = await uploadMedia(
      event,
      [{
        data: file.data,
        type: file.type,
        filename: file.filename,
      }],
      {
        folder: "profile-pictures",
        entityId: user.id,
        allowedMimeTypes: ALLOWED_MIME_TYPES,
      },
    );

    if (!attachments.length) {
      throw createError({
        statusCode: 500,
        message: "Failed to upload image.",
      });
    }

    const imageUrl = attachments[0]!.url;

    if (user.image) await deleteMediaFile(event, user.image);

    const { updateUserProfile } = await userQueries(event);
    const updatedUser = await updateUserProfile(user.id, { image: imageUrl });

    await setPortalUserSession(event, {
      user: {
        ...user,
        image: imageUrl,
      },
    });

    return {
      success: true,
      message: "Profile picture updated successfully",
      url: imageUrl,
      user: updatedUser,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "Update Profile Picture", event);
  }
});
