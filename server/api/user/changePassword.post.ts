import { userQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  const { user } = await requirePortalUserSession(event, {
    message: "You must be logged in to change your password.",
  });

  try {
    const body = await readValidatedBody(event, body => changePasswordSchema.safeParse(body));

    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: `Invalid request: ${body.error.issues
          .map(i => i.message)
          .join(", ")}`,
      });
    }

    const { currentPassword, newPassword, confirmPassword } = body.data;

    const { getUserById, updateUserProfile } = await userQueries();

    const userRecord = await getUserById(user.id);

    if (!userRecord) {
      throw createError({
        statusCode: 404,
        message: "User not found.",
      });
    }

    const isCurrentPasswordValid = await verifyHashedValue(userRecord.password, currentPassword);

    if (!isCurrentPasswordValid) {
      throw createError({
        statusCode: 401,
        message: "Current password is incorrect.",
      });
    }

    if (newPassword !== confirmPassword) {
      throw createError({
        statusCode: 400,
        message: "New password and confirmation do not match.",
      });
    }

    const hashedNewPassword = await hash(newPassword);

    await updateUserProfile(
      user.id,
      { password: hashedNewPassword },
    );

    return {
      success: true,
      message: "Password changed successfully.",
      userRole: userRecord.role,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Change Password", event);
  }
});
