import { roomQueries } from "~~/server/db/queries/room";
import { handleError } from "~~/server/utils/errorHandler";

export default defineEventHandler(async (event) => {
  const scope = await adminSessionCheck(event);

  try {
    if (
      !scope.isPlatformAdmin
      && scope.companyRole !== "owner"
      && !scope.hostelId
    ) {
      throw createError({
        statusCode: 403,
        message: "No assigned hostel or insufficient permission.",
      });
    }

    const {
      getRoomStatusCount,
      getAllHostelsScoped,
      getScopedRooms,
    } = await roomQueries();

    const {
      totalRooms,
      totalOccupiedRooms,
      totalUnderMaintenance,
      totalAvailableRooms,
      totalVacantRooms,
      totalFullyOccupiedRooms,
      totalPartiallyOccupiedRooms,
      totalReservedRooms,
      totalRoomsNew,
      availableRooms,
      maintenanceRooms,
      occupiedRooms,
    } = await getRoomStatusCount(scope);

    const hostels = await getAllHostelsScoped(scope);
    const rooms = await getScopedRooms(scope);

    return {
      rooms,
      totalRooms,
      totalOccupiedRooms,
      totalAvailableRooms,
      totalUnderMaintenance,
      totalFullyOccupiedRooms,
      totalVacantRooms,
      totalPartiallyOccupiedRooms,
      totalReservedRooms,
      totalRoomsNew,
      availableRooms,
      maintenanceRooms,
      occupiedRooms,
      hostels,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Get Room Data", event);
  }
});
