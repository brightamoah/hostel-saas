import { eventHandler } from "h3";

export default eventHandler(async (event) => {
  const session = await getPortalUserSession(event);

  if (Object.keys(session).length > 0) {
    await sessionHooks.callHookParallel("fetch", session, event);
  }

  const { secure, ...data } = session;

  return data;
});
