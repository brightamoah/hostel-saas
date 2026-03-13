import { clearPortalUserSession } from "~~/server/utils/portalSession";

export default defineEventHandler(async (event) => {
  await clearPortalUserSession(event);

  return {
    loggedOut: true,
  };
});
