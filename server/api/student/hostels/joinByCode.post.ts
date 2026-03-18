import { roomQueries, userQueries } from "~~/server/db/queries";
import { joinCodeSchema } from "~~/shared/utils/schema";
import z from "zod";

export default defineEventHandler(async (event) => {
  try {
    const { user } = await requirePortalUserSession(event, {
      message: "You must be logged in to join a hostel",
    });

    if (user.role !== "student") {
      throw createError({
        statusCode: 403,
        message: "Only students can join hostels",
      });
    }

    const body = await readValidatedBody(event, body => z.object({
      code: joinCodeSchema,
    }).safeParse(body));

    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: `${body.error.issues
          .map(i => i.message)
          .join(", ")}`,
      });
    }

    const joinCode = body.data.code.trim().toUpperCase();

    const { getStudentGenderByUserId } = await userQueries();

    const {
      getHostelByCode,
      getAvailableRoomsForStudent,
      getRoomTypes,
      getGenderSpecificRoomStats,
    } = await roomQueries();

    const student = await getStudentGenderByUserId(user.id);

    if (!student) {
      throw createError({
        statusCode: 404,
        message: "Student profile not found",
      });
    }

    const hostel = await getHostelByCode(joinCode);

    if (!hostel) {
      throw createError({
        statusCode: 404,
        message: "Invalid or expired join code",
      });
    }

    const rooms = await getAvailableRoomsForStudent(
      hostel.id,
      student.gender,
    );

    const roomTypes = await getRoomTypes(
      hostel.id,
      student.gender,
    );

    const roomStats = await getGenderSpecificRoomStats(
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
        minimumRoomPrice: roomStats?.minimumPrice,
        maximumRoomPrice: roomStats?.maximumPrice,
      },
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "Get Hostels", event);
  }
});
