import { roomQueries } from "~~/server/db/queries/room";
import { handleError } from "~~/server/utils/errorHandler";

export default defineEventHandler(async (event) => {
  const scope = await adminSessionCheck(event);

  try {
    const { getRoomByIdScoped } = await roomQueries();

    const id = getRouterParam(event, "roomId");

    if (!id || Number.isNaN(Number(id))) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid or missing Room ID.",
      });
    }

    const roomId = Number(id);

    const room = await getRoomByIdScoped(roomId, scope);
    if (!room) {
      throw createError({
        statusCode: 404,
        message: "Room not found",
      });
    }

    return { room };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Get Room by ID", event);
  }
});
