import { userQueries } from "~~/server/db/queries";
import { deleteMediaFile } from "~~/server/utils/r2Upload";

export default defineEventHandler(async (event) => {
  try {
    const { user } = await requirePortalUserSession(event, {
      message: "Unauthorized access",
    });

    if (user.image) await deleteMediaFile(event, user.image);

    const { updateUserProfile } = await userQueries(event);
    const updatedUser = await updateUserProfile(user.id, { image: null });

    await setPortalUserSession(event, {
      user: {
        ...user,
        image: null,
      },
    });

    return {
      success: true,
      message: "Profile picture removed successfully",
      user: updatedUser,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "Remove Profile Picture", event);
  }
});
