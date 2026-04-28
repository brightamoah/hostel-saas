import { eventHandler } from "h3";

defineRouteMeta({
  openAPI: {
    summary: "Get current user session",
    tags: ["Auth"],
    responses: {
      200: {
        description: "Current user session details",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                id: { type: "string" },
                user: {
                  type: "object",
                  nullable: true,
                },
                loggedInAt: { type: "string", format: "date-time", nullable: true },
                expiresAt: { type: "string", format: "date-time" },
                onboarded: { type: "boolean" },
                hasActiveAllocation: { type: "boolean" },
                selectedHostelId: { type: "number", nullable: true },
                selectedHostelSlug: { type: "string", nullable: true },
                portal: { type: "string", enum: ["admin", "public"] },
              },
              required: ["id", "expiresAt", "onboarded", "portal"],
            },
          },
        },
      },
    },
  },
});

export default eventHandler(async (event) => {
  const session = await getPortalUserSession(event);

  if (Object.keys(session).length > 0) {
    await sessionHooks.callHookParallel("fetch", session, event);
  }

  const { secure, ...data } = session;

  return data;
});
