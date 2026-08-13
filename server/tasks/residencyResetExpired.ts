import { and, eq, lte } from "drizzle-orm";
import { roomQueries } from "~~/server/db/queries";
import { allocation } from "~~/server/db/schema";
import { useDB } from "~~/server/utils/db";

export default defineTask({
  meta: {
    name: "residencyResetExpired",
    description: "Daily task to expire student residencies whose endDate has passed",
  },
  async run() {
    const runtimeConfig = useRuntimeConfig();

    if (!runtimeConfig.residencyResetEnabled) {
      return {
        result: "Residency reset feature is currently disabled via feature flag.",
      };
    }

    const { db } = useDB();
    const { resetHostelResidency } = await roomQueries();

    const todayStr = new Date().toISOString().split("T")[0]!;

    // Find distinct hostelIds with expired active allocations
    const expiredHostelRows = await db
      .selectDistinct({ hostelId: allocation.hostelId })
      .from(allocation)
      .where(
        and(
          eq(allocation.status, "active"),
          lte(allocation.endDate, todayStr),
        ),
      );

    if (!expiredHostelRows.length) {
      return { result: "No expired residencies found today." };
    }

    let processedHostels = 0;
    for (const row of expiredHostelRows) {
      const idempotencyKey = `cron-${row.hostelId}-${todayStr}`;
      try {
        await resetHostelResidency({
          hostelId: row.hostelId,
          idempotencyKey,
          triggerSource: "cron",
        });
        processedHostels++;
      }
      catch (err) {
        console.error(`Error executing cron residency reset for hostel ${row.hostelId}:`, err);
      }
    }

    return {
      result: `Processed residency reset for ${processedHostels} hostels on ${todayStr}.`,
    };
  },
});
