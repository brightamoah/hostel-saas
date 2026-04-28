import { clearPortalUserSession } from "~~/server/utils/portalSession";

defineRouteMeta({
  openAPI: {
    summary: "Logout current session",
    tags: ["Auth"],
    responses: {
      200: {
        description: "Successfully logged out",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                loggedOut: {
                  type: "boolean",
                  description: "Indicates whether the logout was successful",
                },
              },
              required: ["loggedOut"],
            },
          },
        },
      },
    },
  },
});

export default defineEventHandler(async (event) => {
  await clearPortalUserSession(event);

  return {
    loggedOut: true,
  };
});
