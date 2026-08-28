import { roomQueries } from "~~/server/db/queries";

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
                loggedInAt: {
                  type: "string",
                  format: "date-time",
                  nullable: true,
                },
                expiresAt: {
                  type: "string",
                  format: "date-time",
                },
                onboarded: {
                  type: "boolean",
                },
                hasActiveAllocation: {
                  type: "boolean",
                },
                selectedHostelId: {
                  type: "number",
                  nullable: true,
                },
                selectedHostelSlug: {
                  type: "string",
                  nullable: true,
                },
                portal: {
                  type: "string",
                  enum: ["admin", "public"],
                },
              },
              required: ["id", "expiresAt", "onboarded", "portal"],
            },
          },
        },
      },
    },
  },
});

const CHECK_INTERVAL_MS = 120 * 1000; // 120s check interval for active sessions

export default defineEventHandler(async (event) => {
  const session = await getPortalUserSession(event);

  if (session?.user && session.user.role !== "admin" && session.user.studentId) {
    const now = Date.now();
    const lastCheck = session.lastAllocationCheckAt ? new Date(session.lastAllocationCheckAt).getTime() : 0;
    const isInactive = !session.hasActiveAllocation;
    const isStale = now - lastCheck > CHECK_INTERVAL_MS;

    if (isInactive || isStale) {
      try {
        const { checkActiveOrPendingAllocation } = await roomQueries(event);
        const activeAllocation = await checkActiveOrPendingAllocation(session.user.studentId);
        const dbHasActiveAllocation = !!activeAllocation;

        if (session.hasActiveAllocation !== dbHasActiveAllocation || isStale) {
          session.hasActiveAllocation = dbHasActiveAllocation;
          session.lastAllocationCheckAt = new Date().toISOString();

          if (activeAllocation?.hostelId) {
            session.selectedHostelId = activeAllocation.hostelId;
          }

          await setPortalUserSession(event, {
            hasActiveAllocation: dbHasActiveAllocation,
            selectedHostelId: activeAllocation?.hostelId ?? session.selectedHostelId,
            lastAllocationCheckAt: session.lastAllocationCheckAt,
          });
        }
      }
      catch {}
    }
  }

  if (Object.keys(session).length > 0) {
    await sessionHooks.callHookParallel("fetch", session, event);
  }

  const { secure, ...data } = session;

  return data;
});
