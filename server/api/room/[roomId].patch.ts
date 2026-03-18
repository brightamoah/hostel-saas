import { roomQueries } from "~~/server/db/queries/room";
import { handleError } from "~~/server/utils/errorHandler";

export default defineEventHandler(async (event) => {
  const scope = await adminSessionCheck(event);

  try {
    const { editRoomById, getRoomByIdScoped, getExistingRoomByRoomNumberAndHostel } = await roomQueries();

    const body = await readValidatedBody(event, body => editRoomSchema.safeParse(body));

    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: `Invalid data: ${body.error.issues.map(i => i.message).join(", ")}`,
      });
    }

    const { roomId, data } = body.data;

    if (data.roomNumber) {
      const originalRoom = await getRoomByIdScoped(roomId, scope);

      if (!originalRoom) {
        throw createError({
          statusCode: 404,
          message: "Room not found",
        });
      }

      const existingRoom = await getExistingRoomByRoomNumberAndHostel(data.roomNumber, originalRoom.hostelId);

      if (existingRoom && existingRoom.id !== roomId) {
        throw createError({
          statusCode: 409,
          message: `A room with number "${data.roomNumber}" already exists in this hostel.`,
        });
      }
    }

    const updatedRoom = await editRoomById(roomId, data, scope);

    if (!updatedRoom) {
      throw createError({
        statusCode: 404,
        message: "Room not found or unauthorized",
      });
    }

    return {
      success: true,
      message: "Room updated successfully",
      room: updatedRoom,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Edit Room", event);
  }
});
