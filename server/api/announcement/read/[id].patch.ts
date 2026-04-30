import type { AuditContext } from "~~/shared/types";

import { announcementQueries } from "~~/server/db/queries";

defineRouteMeta({
  openAPI: {
    summary: "Update announcement read status",
    tags: ["Announcements"],
    parameters: [
      {
        name: "id",
        in: "path",
        required: true,
        schema: { type: "number" },
      },
    ],
    requestBody: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              action: { type: "string", enum: ["read", "unread"] },
            },
            required: ["action"],
          },
        },
      },
    },
    responses: {
      200: {
        description: "Read status updated",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean" },
                message: { type: "string" },
                id: { type: "number" },
              },
            },
          },
        },
      },
    },
  },
});

export default defineEventHandler(async (event) => {
  const { user } = await requirePortalUserSession(event, {
    message: "Unauthorized Access: Please log in to continue.",
  });

  try {
    const id = Number(getRouterParams(event).id);

    if (!id || Number.isNaN(id)) {
      throw createError({
        statusCode: 400,
        message: "Invalid announcement ID.",
      });
    }

    const companyId = user.companyId;

    if (!companyId) {
      throw createError({
        statusCode: 403,
        message: "You do not have permission to update announcement read status. Please contact support if you believe this is an error.",
      });
    }

    const body = await readValidatedBody(event, body => readStatusSchema.safeParse(body));

    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: `${body.error.issues
          .map(i => i.message)
          .join(", ")}`,
      });
    }

    const { action } = body.data;

    const { updateAnnouncementReadStatus } = await announcementQueries();

    let auditContext: AuditContext;

    try {
      const scope = await adminSessionCheck(event);
      auditContext = getAuditContext({
        kind: "admin",
        event,
        scope,
        target: {
          companyId,
          hostelId: scope.hostelId,
        },
      });
    }
    catch (error) {
      const statusCode = error && typeof error === "object" && "statusCode" in error
        ? (error as { statusCode?: number }).statusCode
        : undefined;

      if (user.role !== "admin" && statusCode === 403) {
        auditContext = getAuditContext({
          kind: "student",
          event,
          userId: user.id,
          companyId,
        });
      }
      else {
        throw error;
      }
    }

    await updateAnnouncementReadStatus(
      id,
      companyId,
      user.id,
      action === "read",
      auditContext,
    );

    return {
      success: true,
      message: `Announcement marked as ${action} successfully.`,
      id,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Update Announcement Read Status", event);
  }
});
