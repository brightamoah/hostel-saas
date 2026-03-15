import type { UserSession, UserSessionRequired } from "#auth-utils";
import type { OmitWithIndexSignature } from "~~/shared/types";
import type { H3Event } from "h3";

import { defu } from "defu";
import { useSession } from "h3";

async function _portalSession(event: H3Event) {
  const config = useRuntimeConfig(event);
  const surface = getSurface(event);
  const isAdmin = surface === "admin";

  const session = await useSession<UserSession>(event, {
    name: isAdmin ? config.adminSessionName : config.sessionName,
    password: isAdmin ? config.adminSessionPassword : config.sessionPassword,
    cookie: {
      sameSite: "lax",
      secure: config.nodeEnv === "production",
      httpOnly: true,
    },
  });

  return session;
}

export async function getPortalUserSession(event: H3Event): Promise<UserSession> {
  const session = await _portalSession(event);

  return {
    ...session.data,
    id: session.id!,
  };
};

/**
 * Require a user session, throw a 401 error if the user is not logged in
 * @param event
 * @param opts Options to customize the error message and status code
 * @param opts.statusCode The status code to use for the error (defaults to 401)
 * @param opts.message The message to use for the error (defaults to Unauthorized)
 * @see https://github.com/atinux/nuxt-auth-utils
 */
export async function requirePortalUserSession(event: H3Event, opts?: { statusCode?: number; message?: string }) {
  const userSession = await getPortalUserSession(event);

  if (!userSession.user) {
    if (isEvent(event)) {
      throw createError({
        statusCode: opts?.statusCode || 401,
        message: opts?.message || "Unauthorized",
      });
    }
    else {
      throw new Response(opts?.message || "Unauthorized", {
        status: opts?.statusCode || 401,
      });
    }
  }
  return userSession as UserSessionRequired;
}

/**
 * Clear the user session and removing the session cookie
 * @param event The Request (h3) event
 * @returns true if the session was cleared
 */
export async function clearPortalUserSession(event: H3Event): Promise<boolean> {
  const session = await _portalSession(event);

  await sessionHooks.callHookParallel("clear", session.data, event);
  await session.clear();

  return true;
}

/**
 * Set a user session
 * @param event The Request (h3) event
 * @param data User session data, please only store public information since it can be decoded with API calls
 * @see https://github.com/atinux/nuxt-auth-utils
 */
export async function setPortalUserSession(event: H3Event, data: OmitWithIndexSignature<UserSession, "id">): Promise<UserSession> {
  const session = await _portalSession(event);

  await session.update(defu(data, session.data));

  return session.data;
}

/**
 * Replace a user session
 * @param event The Request (h3) event
 * @param data User session data, please only store public information since it can be decoded with API calls
 */
export async function replacePortalUserSession(event: H3Event, data: OmitWithIndexSignature<UserSession, "id">): Promise<UserSession> {
  const session = await _portalSession(event);

  await session.clear();
  await session.update(data);

  return session.data;
}
