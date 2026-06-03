import { announcementQueries } from "~~/server/db/queries";

defineRouteMeta({
  openAPI: {
    summary: "Create a new announcement",
    tags: ["Announcements"],
    requestBody: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              content: { type: "string" },
              priority: { type: "string", enum: ["low", "medium", "high"] },
              targetAudience: { type: "string", enum: ["company", "hostel", "room", "user"] },
              title: { type: "string" },
              targetHostelId: { type: "number", nullable: true },
              targetRoomId: { type: "number", nullable: true },
              targetUserId: { type: "number", nullable: true },
              companyId: { type: "number", nullable: true },
            },
            required: ["content", "priority", "targetAudience", "title"],
          },
        },
      },
    },
    responses: {
      200: {
        description: "Announcement posted successfully",
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
    },
  },
});

export default defineEventHandler(async (event) => {
  const scope = await adminSessionCheck(event);
  const {
    companyId,
    adminData,
    hostelId,
    isPlatformAdmin,
    companyRole,
  } = scope;

  try {
    const body = await readValidatedBody(event, body => createAnnouncementSchema.safeParse(body));

    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: `${body.error.issues
          .map(i => i.message)
          .join(", ")}`,
      });
    }

    if (!isPlatformAdmin && !companyId) {
      throw createError({
        statusCode: 403,
        message: "Your account is not linked to a company. Access denied.",
      });
    }

    const {
      content,
      priority,
      targetAudience,
      title,
      targetHostelId,
      targetRoomId,
      targetUserId,
    } = body.data;

    let finalCompanyId: number | null = null;
    let finalTargetHostelId: number | null = null;

    if (isPlatformAdmin) {
      finalCompanyId = body.data.companyId ?? null;
      finalTargetHostelId = targetHostelId ?? null;
    }
    else if (companyRole === "owner") {
      finalCompanyId = companyId!;
      finalTargetHostelId = targetHostelId ?? null;
    }
    else {
      finalCompanyId = companyId!;

      if (!hostelId) {
        throw createError({
          statusCode: 403,
          message: "Your staff account is not linked to a hostel. Access denied.",
        });
      }
      finalTargetHostelId = hostelId;
    }

    if (targetAudience === "hostel" && !finalTargetHostelId) {
      throw createError({
        statusCode: 403,
        message: "A specific Hostel must be targeted for this audience type.",
      });
    }

    if (targetAudience === "room" && !targetRoomId) {
      throw createError({
        statusCode: 403,
        message: "Target Room is required for this audience.",
      });
    }

    if (targetAudience === "user" && !targetUserId) {
      throw createError({
        statusCode: 400,
        message: "Target User is required for direct announcements.",
      });
    }

    let saveTargetHostelId: number | null = null;

    if (isPlatformAdmin || companyRole === "owner") {
      if (targetAudience === "hostel" || targetAudience === "room") {
        saveTargetHostelId = finalTargetHostelId;
      }
    }
    else {
      saveTargetHostelId = finalTargetHostelId;
    }

    const cleanContent = sanitizeHtmlContent(content);
    const { createAnnouncement } = await announcementQueries(event);

    const auditContext = getAuditContext({
      kind: "admin",
      event,
      scope,
      target: {
        companyId: finalCompanyId,
        hostelId: saveTargetHostelId,
      },
    });

    const newAnnouncement = await createAnnouncement(
      {
        content: cleanContent,
        priority,
        targetAudience,
        title,
        targetHostelId: saveTargetHostelId,
        targetRoomId: targetAudience === "room" ? targetRoomId : null,
        targetUserId: targetAudience === "user" ? targetUserId : null,
        postedBy: adminData.id,
        companyId: finalCompanyId,
      },
      scope,
      auditContext,
    );

    return {
      success: true,
      message: "Your announcement has been posted and will be visible to the target audience shortly.",
      data: newAnnouncement,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Create New Announcement", event);
  }
});
