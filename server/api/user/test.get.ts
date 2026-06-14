import { sql } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  if (!import.meta.dev) {
    throw createError({
      statusCode: 403,
      statusMessage: "Forbidden",
      message: "You are not allowed to access this API.",
    });
  }

  const { isPlatformAdmin } = await adminSessionCheck(event);

  if (!isPlatformAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: "Forbidden",
      message: "You are not allowed to access this API.",
    });
  }

  const { db } = useDB(event);

  const result = await db.execute(sql`select 1 as ok`);

  const csrfToken = event.context.csrfToken;

  const userDetails = db.query.user.findFirst({
    with: {
      admin: true,
      student: true,
      companies: {
        with: {
          admins: {
            with: {
              user: true,
            },
          },
          hostels: {
            with: {
              admins: {
                with: {
                  user: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return {
    result,
    csrf: getCookie(event, "csrf"),
    csrfToken,
    userDetails,
  };
});
