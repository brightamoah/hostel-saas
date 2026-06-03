import { userQueries } from "~~/server/db/queries";
import { handleError } from "~~/server/utils/errorHandler";

export default defineEventHandler(async (event) => {
  try {
    const session = await getPortalUserSession(event);
    let errorMessage: string = "";

    if (!session.user
      || session.user.role !== "student"
      || !session.user.emailVerified) {
      errorMessage = "Forbidden: Must be a verified student";
      throw createError({
        statusCode: 403,
        message: "Forbidden: Must be a verified student",
      });
    }

    const { getStudentByUserId, createNewStudent } = await userQueries(event);

    const rawBody = await readBody(event);

    if (rawBody?.dateOfBirth && typeof rawBody.dateOfBirth === "string") rawBody.dateOfBirth = new Date(rawBody.dateOfBirth);

    const parsed = personalDetailsSchema.safeParse(rawBody);

    if (!parsed.success) {
      errorMessage = `Invalid data: ${parsed.error.issues.map(i => i.message).join(", ")}`;
      throw createError({
        statusCode: 400,
        message: errorMessage,
      });
    }

    const userId = session.user.id;

    const {
      gender,
      dateOfBirth,
      phoneNumber,
      address,
      emergencyContactName,
      emergencyContactPhoneNumber,
      emergencyContactEmail,
      healthConditions,
    } = parsed.data;

    const existingStudent = await getStudentByUserId(userId);

    if (existingStudent) {
      errorMessage = "Student details already exist";
      throw createError({
        statusCode: 409,
        message: "Student details already exist",
      });
    }

    if (!gender || !dateOfBirth || !phoneNumber || !address || !emergencyContactName || !emergencyContactPhoneNumber || !emergencyContactEmail) {
      throw createError({
        statusCode: 400,
        message: "All fields are required",
      });
    }

    const studentData = {
      userId: session.user.id,
      address,
      dateOfBirth: dateOfBirth.toDateString(),
      emergencyContactEmail,
      emergencyContactName,
      emergencyContactPhoneNumber,
      healthConditions,
      gender,
      phoneNumber,
      residencyStatus: "inactive",
    } satisfies StudentInsert;

    const newStudent = await createNewStudent(studentData);

    if (!newStudent) {
      errorMessage = "Failed to save student details";
      throw createError({
        statusCode: 500,
        message: "Failed to save student details",
      });
    }

    await setPortalUserSession(event, {
      ...session,
      user: {
        ...session.user,
        studentId: newStudent.id,
      },
      onboarded: true,
      hasActiveAllocation: false,
      selectedHostelId: null,
      selectedHostelSlug: null,
      portal: "public",
    });

    return {
      success: true,
      message: "Onboarding completed successfully",
      errorMessage,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Onboarding", event);
  }
});
