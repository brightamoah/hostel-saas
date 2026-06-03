import { userQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  const scope = await adminSessionCheck(event);

  const { adminData } = scope;
  try {
    const { getUsers } = await userQueries(event);

    const result = await getUsers(scope);

    const { users } = result;

    if (!users.length) throw createError({ statusCode: 404, message: "No users found" });

    if (event.context.cloudflare?.env.HYPERDRIVE.connectionString) console.log(event.context.cloudflare.env.HYPERDRIVE.connectionString);

    const flattenUsers = users.map((u) => {
      const hostelName
        = u.student?.allocations?.[0]?.room?.hostel?.name
          || u.admin?.hostel?.name
          || "N/A";
      return {
        ...u,
        hostelName,
      };
    });

    return {
      users: flattenUsers,
      message: `Fetched all users for ${adminData.accessLevel} admin`,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Test User Data", event);
  }
});
