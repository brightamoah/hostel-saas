import { userQueries } from "~~/server/db/queries/user";

export default defineEventHandler(async (event) => {
  const scope = await adminSessionCheck(event);

  const { adminData } = scope;

  try {
    const { getUsers } = await userQueries();

    const data = await getUsers(scope);

    const {
      users,
      stats,
    } = data;

    const flattenUsers = users.map((user) => {
      const activeAllocation = Array.isArray(user.student?.allocations)
        ? user.student.allocations.find(alloc => alloc.status === "active")
        : null;

      const hostelName
        = activeAllocation?.room?.hostel?.name
          || user.student?.allocations?.[0]?.room?.hostel?.name
          || user.admin?.hostel?.name
          || "N/A";

      const { emailVerified, ...rest } = user;

      return {
        ...rest,
        hostelName,
        isEmailVerified: emailVerified,
        emailVerified,
      };
    });

    return {
      users: flattenUsers,
      stats,
      message: `Fetched user data for ${adminData.accessLevel} admin`,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Get User Data", event);
  }
});
