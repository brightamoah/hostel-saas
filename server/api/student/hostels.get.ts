import { roomQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  await requireUserSession(event, {
    message: "User not authenticated",
  });

  try {
    const { getAllHostels } = await roomQueries();

    const hostels = await getAllHostels();

    return hostels;
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "Get Hostels", event);
  }
});
