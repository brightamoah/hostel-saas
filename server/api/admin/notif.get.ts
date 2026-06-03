import { notificationQueries } from "~~/server/db/queries/notification";

defineRouteMeta({
  openAPI: {
    summary: "Get admin notifications",
    tags: ["Admin", "Notifications"],
    responses: {
      200: {
        description: "List of notifications for the admin",
        content: {
          "application/json": {
            schema: {
              type: "array",
              items: {
                type: "object",
                // specific notification properties based on your NotificationDTO type
              },
            },
          },
        },
      },
    },
  },
});

export default defineEventHandler(async (event) => {
  const scope = await adminSessionCheck(event);

  try {
    const { getNotifications } = await notificationQueries(event);

    const notifications = await getNotifications(scope, 20);

    return notifications;
  }
  catch (error) {
    handleError(error, "Get Notifications", event);
    return [];
  }
});
