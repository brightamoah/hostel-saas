import { sql } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const { db } = useDB(event);

  const result = await db.execute(sql`select 1 as ok`);

  return result;
});
