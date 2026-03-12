import { userQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  try {
    const session = await requireUserSession(event, {
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

    const { roomId, userId, endDate } = body.data;

    const student = await getStudentIdByUserId(userId);

    if (!student) {
      throw createError({
        statusCode: 404,
        message: "Student profile not found. Cannot book room.",
      });
    }

    const studentId = student.id;

    const allocation = await bookRoom(studentId, roomId, endDate);

    await setUserSession(event, {
      ...session,
      hasActiveAllocation: true,
      selectedHostelId: allocation.hostel.id,
      selectedHostelSlug: allocation.hostel.slug,
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
