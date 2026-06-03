import { roomQueries } from "~~/server/db/queries";
import { handleError } from "~~/server/utils/errorHandler";

export default defineEventHandler(async (event) => {
  const scope = await adminSessionCheck(event);

  const companyId = scope.companyId;

  try {
    const { getExistingRoomByRoomNumberAndHostel, addNewRoom } = await roomQueries(event);

    const body = await readValidatedBody(event, body => addRoomSchema.safeParse(body));

    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: `Invalid data: ${body.error.issues.map(i => i.message).join(", ")}`,
      });
    }

    if (!companyId) {
      throw createError({
        statusCode: 403,
        message: "Admin not associated with any company",
      });
    }

    let hostelId: number | null = null;

    const {
      amountPerYear,
      hostelId: hostelIdFromBody,
      capacity,
      currentOccupancy,
      features,
      floor,
      roomNumber,
      roomType,
      status,
      allowedGender,
    } = body.data;

    hostelId = hostelIdFromBody;

    if (!scope.isPlatformAdmin && scope.companyRole !== "owner") {
      if (!scope.hostelId) {
        throw createError({ statusCode: 403, message: "No hostel assigned to your account." });
      }
      hostelId = scope.hostelId;
    }

    const existingRoom = await getExistingRoomByRoomNumberAndHostel(roomNumber, hostelId);

    if (existingRoom) {
      throw createError({
        statusCode: 409,
        message: "Room with this number already exists",
      });
    }

    const auditContext = getAuditContext({
      event,
      kind: "admin",
      scope,
      target: {
        companyId,
        hostelId,
      },
    });

    const newRoom = await addNewRoom({
      amountPerYear,
      hostelId,
      capacity,
      currentOccupancy,
      features,
      floor,
      roomNumber,
      roomType,
      status,
      allowedGender,
      companyId,
    }, scope, auditContext);

    if (!newRoom) {
      throw createError({
        statusCode: 500,
        message: "Failed to save room details",
      });
    }

    return {
      success: true,
      message: "Room added successfully",
    };
  }
  catch (error: any) {
    console.error("Error adding new room:", error);

    if (error.code === "23505") throw createError({ statusCode: 409, message: "Room with this number already exists" });

    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Add New Room", event);
  }
});
