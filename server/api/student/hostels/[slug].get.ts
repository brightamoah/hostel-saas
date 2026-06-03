import { roomQueries, userQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  try {
    const { user } = await requirePortalUserSession(event, {
      message: "Please log in to view hostel details",
    });

    if (user.role !== "student") {
      throw createError({
        statusCode: 403,
        message: "Only students can view hostel details",
      });
    }

    const slug = getRouterParam(event, "slug");

    if (!slug) {
      throw createError({
        statusCode: 400,
        message: "Hostel slug is required",
      });
    }

    const { getStudentGenderByUserId } = await userQueries(event);
    const {
      getHostelBySlug,
      getAvailableRoomsForStudent,
      getRoomTypes,
      getGenderSpecificRoomStats,
    } = await roomQueries(event);

    const student = await getStudentGenderByUserId(user.id);

    if (!student) {
      throw createError({
        statusCode: 404,
        message: "Student profile not found",
      });
    }

    const hostel = await getHostelBySlug(slug);

    if (!hostel) {
      throw createError({
        statusCode: 404,
        message: "Hostel not found",
      });
    }

    const roomStats = await getGenderSpecificRoomStats(hostel.id, student.gender);

    const rooms = await getAvailableRoomsForStudent(
      hostel.id,
      student.gender,
    );

    const roomTypes = await getRoomTypes(
      hostel.id,
      student.gender,
    );

    return {
      hostel,
      rooms,
      studentGender: student.gender,
      roomTypes,
      stats: {
        availableRooms: roomStats?.availableRooms,
        totalRooms: roomStats?.totalRooms,
        minimumPrice: roomStats?.minimumPrice,
        maximumPrice: roomStats?.maximumPrice,
      },
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "Get Hostels", event);
  }
});
