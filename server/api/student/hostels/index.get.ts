import { roomQueries, userQueries } from "~~/server/db/queries";
import { getImageFullUrl } from "~~/server/utils/getImageFullUrl";

export default defineEventHandler(async (event) => {
  const { user } = await requirePortalUserSession(event, {
    message: "Unauthorized Access: Please log in to continue.",
  });

  try {
    const {
      // getHostelsPaginated ,
      getAllHostels,
    } = await roomQueries(event);
    const { getStudentGenderByUserId } = await userQueries(event);

    // const query = getQuery(event);

    // const {
    //   searchTerm,
    //   sort = "availability",
    //   page = "1",
    //   limit = "20",
    // } = query;

    // const validSorts = ["price_asc", "price_desc", "availability", "name"];
    // const sortBy = validSorts.includes(sort as string)
    //   ? (sort as "price_asc" | "price_desc" | "availability" | "name")
    //   : "availability";

    // const pageNum = Math.max(1, Number.parseInt(page as string) || 1);
    // const limitNum = Math.min(50, Math.max(1, Number.parseInt(limit as string) || 20));

    const student = await getStudentGenderByUserId(user.id);

    if (!student) {
      throw createError({
        statusCode: 404,
        message: "Student profile not found",
      });
    }

    const hostels = await getAllHostels(student.gender);

    // const paginatedResult = await getHostelsPaginated({
    //   gender: student.gender,
    //   searchTerm: searchTerm as string | undefined,
    //   sort: sortBy,
    //   page: pageNum,
    //   limit: limitNum,
    // });

    // const hostelsWithLogos = paginatedResult.data.map((hostel) => {
    //   const roomTypes = [...new Set(hostel.roomTypes)];

    //   let logoUrl = hostel.logoUrl;

    //   if (logoUrl && typeof logoUrl === "string") {
    //     logoUrl = getImageFullUrl(logoUrl, event);
    //   }

    //   return {
    //     id: hostel.id,
    //     name: hostel.name,
    //     slug: hostel.slug,
    //     address: hostel.address,
    //     logoUrl,
    //     status: hostel.status,
    //     companyId: hostel.companyId,
    //     joinCode: hostel.joinCode,
    //     minimumRoomPrice: hostel.minimumRoomPrice ?? 0,
    //     maximumRoomPrice: hostel.maximumRoomPrice ?? 0,
    //     availableRooms: hostel.availableRooms ?? 0,
    //     totalCapacity: hostel.totalCapacity ?? 0,
    //     currentOccupancy: hostel.currentOccupancy ?? 0,
    //     roomTypes,
    //   };
    // });

    const hostelsWithLogos = hostels.map((hostel) => {
      const roomTypes = [...new Set(hostel?.rooms.map(room => room.roomType) ?? [])];
      const allowedGenders = [...new Set(hostel?.rooms.map(room => room.allowedGender) ?? [])];
      const allowedGender = allowedGenders.length > 0
        ? (allowedGenders.length === 1 ? allowedGenders[0] : "mixed")
        : "unassigned";

      const availableRooms = hostel.rooms?.filter(
        r => r.status === "vacant" || (r.status === "partially occupied" && r.currentOccupancy < r.capacity),
      ).length || 0;

      const totalCapacity = hostel.rooms?.reduce((sum, r) => sum + r.capacity, 0) || 0;

      const currentOccupancy = hostel.rooms?.reduce((sum, r) => sum + r.currentOccupancy, 0) || 0;

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
        allowedGender,
        allowedGenders,
      };
    });

    return hostelsWithLogos;
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "Get Hostels", event);
  }
});
