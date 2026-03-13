import { roomQueries, userQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  const { user } = await requirePortalUserSession(event, {
    message: "Unauthorized Access: Please log in to continue.",
  });

  try {
    const { getStudentByUserId } = await userQueries();
    const { getAvailableRooms, getAllHostels } = await roomQueries();

    const student = await getStudentByUserId(user.id);

    if (!student) {
      throw createError({
        statusCode: 404,
        message: "Student profile not found.",
      });
    }

    const hostelId = student.hostelId;

    if (!hostelId) {
      throw createError({
        statusCode: 404,
        message: "Hostel information not found for the student.",
      });
    }

    const rooms = await getAvailableRooms(student.gender, hostelId);

    const hostels = await getAllHostels();

    return {
      rooms,
      hostels,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Get Student Room Data", event);
  }
});
