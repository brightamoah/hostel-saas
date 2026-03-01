import { notificationQueries } from "~~/server/db/queries/notification";

export default defineEventHandler(async (event) => {
  try {
    const {
      adminData,
      isPlatformAdmin,
      companyId,
      companyRole,
    } = await adminSessionCheck(event);
    const { getNotifications } = await notificationQueries();

    const notifications = await getNotifications({
      adminData,
      isPlatformAdmin,
      companyId,
      companyRole,
    }, 20);

    return notifications;
  }
  catch (error) {
    handleError(error, "Get Notifications", event);
    return [];
  }
});
