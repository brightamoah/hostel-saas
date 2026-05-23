import { announcementQueries, userQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  const { userId, companyId, session, user } = await studentSessionCheck(event);

  try {
    const { getAllAnnouncementForStudent } = await announcementQueries();
    const { getStudentWithRelations } = await userQueries();

    const studentMakingRequest = await getStudentWithRelations(userId);

    if (!studentMakingRequest) {
      throw createError({
        statusCode: 403,
        message: "Account for the student making the request not found or is inactive.",
      });
    }

    const studentCompanyId = companyId ?? studentMakingRequest.companyId;

    if (!studentCompanyId) {
      throw createError({
        statusCode: 403,
        message: "You do not have permission to view announcements. Please contact support if you believe this is an error.",
      });
    }

    const hostelId = studentMakingRequest?.allocations?.[0]?.room?.hostel?.id;
    const roomId = studentMakingRequest?.allocations?.[0]?.room?.id;

    const announcements = await getAllAnnouncementForStudent(
      userId,
      hostelId,
      roomId,
      studentCompanyId,
    );

    await setPortalUserSession(event, {
      ...session,
      user: {
        ...user,
        companyId: studentCompanyId,
      },
    });

    return {
      announcements,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Get Student Announcement Data", event);
  }
});
