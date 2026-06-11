import { announcementQueries, userQueries } from "~~/server/db/queries";

defineRouteMeta({
  openAPI: {
    summary: "Get announcements for the admin",
    tags: ["Announcements"],
    responses: {
      200: {
        description: "List of announcements relevant to the admin",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                announcements: {
                  type: "array",
                  items: {
                    type: "object",
                  },
                },
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
  const { userId } = scope;

  try {
    const { getAdminByUserId } = await userQueries(event);
    const { getAllAnnouncementsForAdmin } = await announcementQueries(event);

    const adminMakingRequest = await getAdminByUserId(
      userId,
      true,
      scope,
    );

    if (!adminMakingRequest) {
      throw createError({
        statusCode: 403,
        message: "Account for the admin making the request not found or is inactive.",
      });
    }

    const announcements = await getAllAnnouncementsForAdmin(scope);

    if (!announcements?.length) return { announcements: [] };

    for (const announcement of announcements) {
      announcement.content = sanitizeHtmlContent(announcement.content) as string;
    }

    return {
      announcements,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Get Announcement Data", event);
  }
});
