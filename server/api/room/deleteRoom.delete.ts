import { roomQueries } from "~~/server/db/queries/room";

import { getSpecificRoomError } from "~/utils/roomErrors";

export default defineEventHandler(async (event) => {
  const scope = await adminSessionCheck(event);
  const { getErrorMessage } = getSpecificRoomError();

  try {
    if (!scope.isPlatformAdmin && !scope.companyId) {
      throw createError({
        statusCode: 403,
        message: "Your account is not linked to a company. Access denied.",
      });
    }

    if (!scope.isPlatformAdmin && scope.companyRole !== "owner") {
      throw createError({
        statusCode: 403,
        message: "Only company owners can delete rooms. Access denied.",
      });
    }

    const body = await readValidatedBody(event, body => deleteItemSchema.safeParse(body));

    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: `${body.error.issues
          .map(i => i.message)
          .join(", ")}`,
      });
    }

    const { ids } = body.data;

    const { deleteRoomsByIds, getRoomsByIds } = await roomQueries();

    const roomsToDelete = await getRoomsByIds(ids);

    if (roomsToDelete.length !== ids.length) {
      const foundIds = roomsToDelete.map(r => r.id);
      const notFoundIds = ids.filter(id => !foundIds.includes(id));
      throw createError({
        statusCode: 404,
        message: `One or more rooms not found. Could not find rooms with IDs: ${notFoundIds.join(", ")}.`,
      });
    }

    const occupiedRooms = roomsToDelete.filter(
      room => room.currentOccupancy > 0,
    );

    if (occupiedRooms.length > 0) {
      throw createError({
        statusCode: 409,
        message: `Cannot delete rooms that are occupied. The following rooms have occupants: ${occupiedRooms.map(r => r.roomNumber).join(", ")}.`,
      });
    }

    const reservedRooms = roomsToDelete.filter(
      room => room.status === "reserved",
    );

    if (reservedRooms.length > 0) {
      throw createError({
        statusCode: 409,
        message: `Cannot delete rooms that are reserved. The following rooms are reserved: ${reservedRooms.map(r => r.roomNumber).join(", ")}.`,
      });
    }

    const roomsUnderMaintenance = roomsToDelete.filter(
      room => room.status === "under maintenance",
    );

    if (roomsUnderMaintenance.length > 0) {
      throw createError({
        statusCode: 409,
        message: `Cannot delete rooms that are under maintenance. The following rooms are under maintenance: ${roomsUnderMaintenance.map(r => r.roomNumber).join(", ")}.`,
      });
    }

    const deletedRooms = await deleteRoomsByIds(ids, scope);

    if (deletedRooms.length === 0) {
      throw createError({
        statusCode: 404,
        message: `Deletion failed. No rooms were deleted for the provided IDs: ${ids.join(", ")}.`,
      });
    }

    return {
      success: true,
      message: `${deletedRooms.length} room(s) successfully deleted.`,
    };
  }
  catch (error: any) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    const errorMessage = getErrorMessage(error);

    throw createError({
      statusCode: 500,
      message: errorMessage.message,
      cause: error.cause,
    });
  }
});
