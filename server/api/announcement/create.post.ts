import { announcementQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  const scope = await adminSessionCheck(event);
  const {
    companyId,
    adminData,
    hostelId,
    isPlatformAdmin,
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

    const mode = getScopeMode(scope);

    if (mode === "hostel") {
      if (targetAudience === "hostel" && targetHostelId !== hostelId) {
        throw createError({
          statusCode: 403,
          message: "Permission denied: You can only post announcements to your assigned hostel.",
        });
      }
    }

    if (targetAudience === "hostel" && !targetHostelId) {
      throw createError({
        statusCode: 400,
        message: "Target Hostel is required for this audience.",
      });
    }

    if (targetAudience === "room" && !targetRoomId) {
      throw createError({
        statusCode: 400,
        message: "Target Room is required for this audience.",
      });
    }

    if (targetAudience === "user" && !targetUserId) {
      throw createError({
        statusCode: 400,
        message: "Target User is required for direct announcements.",
      });
    }

    const cleanContent = sanitizeHtmlContent(content);
    const { createAnnouncement } = await announcementQueries();

    const targetCompanyId = isPlatformAdmin ? body.data.companyId : companyId;

    if (!targetCompanyId && targetAudience !== "all") {
      throw createError({
        statusCode: 400,
        message: "A Company ID is required for targeted announcements.",
      });
    }

    const newAnnouncement = await createAnnouncement({
      content: cleanContent,
      priority,
      targetAudience,
      title,
      targetHostelId: targetAudience === "hostel" ? targetHostelId : null,
      targetRoomId: targetAudience === "room" ? targetRoomId : null,
      targetUserId: targetAudience === "user" ? targetUserId : null,
      postedBy: adminData.id,
      companyId: targetCompanyId,
    }, scope);

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
