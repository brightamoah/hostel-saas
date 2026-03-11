import { roomQueries } from "~~/server/db/queries";
import { getImageFullUrl } from "~~/server/utils/getImageFullUrl";

export default defineEventHandler(async (event) => {
  await requireUserSession(event, {
    message: "",
  });

  try {
    const { getAllHostels } = await roomQueries();

    const hostels = await getAllHostels();

    const hostelsWithLogos = hostels.map((hostel) => {
      const availableRooms = hostel.rooms?.filter(
        r => r.status === "vacant" || (r.status === "partially occupied" && r.currentOccupancy < r.capacity),
      ).length || 0;

      const totalCapacity = hostel.rooms?.reduce((sum, r) => sum + r.capacity, 0) || 0;

      const currentOccupancy = hostel.rooms?.reduce((sum, r) => sum + r.currentOccupancy, 0) || 0;

      const roomTypes = [...new Set(hostel.rooms?.map(r => r.roomType) || [])];

      let logoUrl = hostel.logoUrl;

      if (logoUrl && typeof logoUrl === "string") {
        logoUrl = getImageFullUrl(logoUrl, event);
      }

      return {
        id: hostel.id,
        name: hostel.name,
        slug: hostel.slug,
        address: hostel.address,
        logoUrl,
        status: hostel.status,
        companyId: hostel.companyId,
        joinCode: hostel.joinCode,
        minimumRoomPrice: hostel.minimumRoomPrice || 0,
        maximumRoomPrice: hostel.maximumRoomPrice || 0,
        availableRooms,
        totalCapacity,
        currentOccupancy,
        roomTypes,
      };
    });

    return hostelsWithLogos;
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "Get Hostels", event);
  }
});
