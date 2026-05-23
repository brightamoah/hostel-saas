import { userQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  try {
    const session = await requirePortalUserSession(event, {
      message: "Unauthorized Access: Please log in to continue.",
    });

    if (session.user.role !== "student") {
      throw createError({
        statusCode: 403,
        message: "Only students can book rooms",
      });
    }

    const body = await readValidatedBody(event, body => bookRoomSchema.safeParse(body));

    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: `Invalid request: ${body.error.issues
          .map(i => i.message)
          .join(", ")}`,
      });
    }

    const { getStudentIdByUserId } = await userQueries();

    const { roomId, endDate, academicPeriod, userId } = body.data;

    if (userId !== session.user.id) {
      throw createError({
        statusCode: 403,
        message: "You cannot book a room for another user",
      });
    }

    const student = await getStudentIdByUserId(userId);
    if (!student) {
      throw createError({
        statusCode: 404,
        message: "Student profile not found. Cannot book room.",
      });
    }

    const studentId = student.id;

    const auditContext = getAuditContext({
      kind: "student",
      event,
      companyId: session.user.companyId!,
      hostelId: session.selectedHostelId!,
      userId: session.user.id,
    });

    const allocation = await bookRoom(
      studentId,
      roomId,
      auditContext,
      endDate,
      academicPeriod,
    );

    await setPortalUserSession(event, {
      ...session,
      hasActiveAllocation: true,
      selectedHostelId: allocation.hostel.id,
      selectedHostelSlug: allocation.hostel.slug,
      companyId: allocation.hostel.companyId,
      user: {
        ...session.user,
        companyId: allocation.hostel.companyId,
      },
      portal: "public",
    });

    return {
      success: true,
      message: `Room ${allocation.room.roomNumber} at ${allocation.hostel.name} booked successfully. An invoice has been generated.`,
      allocation,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Book Student Room", event);
  }
});
