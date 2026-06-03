import { announcementQueries } from "~~/server/db/queries";

defineRouteMeta({
  openAPI: {
    summary: "Edit an announcement",
    tags: ["Announcements"],
    parameters: [
      {
        name: "id",
        in: "path",
        required: true,
        schema: { type: "number" },
        description: "ID of the announcement to edit",
      },
    ],
    requestBody: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              announcementId: { type: "number" },
              data: { type: "object" },
              resetReadStatus: { type: "boolean", nullable: true },
            },
            required: ["announcementId", "data"],
          },
        },
      },
    },
    responses: {
      200: {
        description: "Announcement updated successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean" },
                message: { type: "string" },
                data: { type: "object" },
              },
            },
          },
        },
      },
      400: { description: "Invalid input or ID mismatch" },
      403: { description: "Unauthorized to edit" },
      404: { description: "Announcement not found" },
    },
  },
});

export default defineEventHandler(async (event) => {
  const scope = await adminSessionCheck(event);

  try {
    const idFromParams = Number(getRouterParams(event).id);

    const body = await readValidatedBody(event, body => editAnnouncementSchema.safeParse(body));

    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: `${body.error.issues
          .map(i => i.message)
          .join(", ")}`,
      });
    }

    const { announcementId, data, resetReadStatus } = body.data;

    if (announcementId !== idFromParams) {
      throw createError({
        statusCode: 400,
        message: "Announcement ID in the URL does not match the ID in the request body.",
      });
    }

    if (data.content) {
      data.content = sanitizeHtmlContent(data.content);
    }

    const { editAnnouncement, getAnnouncementById } = await announcementQueries(event);

    const auditContext = getAuditContext({
      kind: "admin",
      event,
      scope,
      target: {
        companyId: data.companyId ?? scope.companyId,
        hostelId: data.targetHostelId,
      },
    });

    const updatedAnnouncement = await editAnnouncement(
      announcementId,
      scope,
      data,
      resetReadStatus,
      auditContext,
    );

    if (!updatedAnnouncement) {
      const existingAnnouncement = await getAnnouncementById(announcementId, scope);

      if (!existingAnnouncement) {
        throw createError({
          statusCode: 404,
          message: "Announcement not found.",
        });
      }

      throw createError({
        statusCode: 403,
        message: "You are not authorized to edit this announcement.",
      });
    }

    return {
      success: true,
      message: "Announcement updated successfully.",
      data: updatedAnnouncement,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Edit Announcement", event);
  }
});
