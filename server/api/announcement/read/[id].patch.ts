import type { AuditContext } from "~~/shared/types";

import { announcementQueries, userQueries } from "~~/server/db/queries";

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

    let companyId: number | null | undefined = user.companyId;
    let auditContext: AuditContext;

    if (user.role === "student") {
      if (!companyId) {
        const { getStudentByUserId } = await userQueries();
        const student = await getStudentByUserId(user.id);
        companyId = student?.companyId;
      }

      if (!companyId) {
        throw createError({
          statusCode: 403,
          message: "Tenant boundaries missing. Please contact support.",
        });
      }

      auditContext = getAuditContext({
        kind: "student",
        event,
        userId: user.id,
        companyId,
      });
    }
    else {
      const scope = await adminSessionCheck(event);
      const mode = getScopeMode(scope);

      if (mode !== "platform" && !companyId) companyId = scope.companyId;

      if (mode !== "platform" && !companyId) {
        throw createError({
          statusCode: 403,
          message: "Admin tenant boundaries missing.",
        });
      }

      auditContext = getAuditContext({
        kind: "admin",
        event,
        scope,
        target: {
          companyId: companyId || scope.companyId,
          hostelId: scope.hostelId,
        },
      });
    }

    await updateAnnouncementReadStatus(
      id,
      companyId!,
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
