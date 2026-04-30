import z from "zod";

defineRouteMeta({
  openAPI: {
    summary: "Manage announcement drafts",
    tags: ["Announcements"],
    requestBody: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              content: { type: "string" },
              priority: { type: "string", enum: ["low", "medium", "high"] },
              targetAudience: {
                type: "string",
                enum: ["all", "students", "admins", "hostel", "room", "user"],
              },
              targetHostelId: { type: "number", nullable: true },
              targetRoomId: { type: "number", nullable: true },
              targetUserId: { type: "number", nullable: true },
              companyId: { type: "number", nullable: true },
            },
          },
        },
      },
    },
  },
});

export default defineEventHandler(async (event) => {
  const { user } = await requirePortalUserSession(event, {
    message: "Unauthorized, please log in to access announcement drafts.",
  });

  const kv = useStorage("kv");

  const KEY = `announcement-draft-${user.id}`;

  if (event.method === "GET") {
    const draft = await kv.get(KEY);
    return draft || null;
  }

  if (event.method === "POST") {
    const body = await readBody(event);

    const cleanBody = Object.fromEntries(
      Object.entries(body).map(([key, value]) => [
        key,
        value === "" ? undefined : value,
      ]),
    );

    const result = z.object(createAnnouncementSchema.shape).partial().safeParse(cleanBody);

    if (!result.success) {
      throw createError({
        statusCode: 400,
        message: `${result.error.issues
          .map(i => i.message)
          .join(", ")}`,
      });
    }

    await kv.set(KEY, body);

    return { success: true, message: "Draft saved successfully." };
  }

  if (event.method === "DELETE") {
    await kv.del(KEY);
    return { success: true };
  }
});
