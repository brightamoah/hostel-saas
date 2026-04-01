import { userQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  const { user } = await requirePortalUserSession(event);

  try {
    const body = await readValidatedBody(event, body => updatePhoneNumberSchema.safeParse(body));

    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: `Invalid request: ${body.error.issues
          .map(i => i.message)
          .join(", ")}`,
      });
    }

    const { phoneNumber, password } = body.data;

    const { updatePhoneNumber, getUserExtended } = await userQueries();

    const userData = await getUserExtended(user.id);
    if (!userData) {
      throw createError({
        statusCode: 404,
        message: "You are not authorized to perform this action.",
      });
    }

    if (userData.phoneNumber === phoneNumber) {
      throw createError({
        statusCode: 400,
        message: "The new phone number is the same as the current one.",
      });
    }

    const isPasswordValid = await verifyHashedValue(userData.password, password);

    if (!isPasswordValid) {
      throw createError({
        statusCode: 401,
        message: "Incorrect password. Please try again.",
      });
    }

    await updatePhoneNumber(user.id, phoneNumber, userData.role);

    return {
      success: true,
      message: "Phone number updated successfully.",
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Update Phone Number", event);
  }
});
