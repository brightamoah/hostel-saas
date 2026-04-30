/* eslint-disable no-console */
import { sql } from "drizzle-orm";

import { auditLogQueries } from "../db/queries/auditLog";

export default defineTask({
  meta: {
    name: "cancelUnpaidAllocations",
    description: "Cancel pending allocations without 60% payment after 3 days",
  },
  async run() {
    const { db } = useDB();

    console.log("Running task: Cancel unpaid allocations...");

    try {
      const result = await db.execute(sql`SELECT * FROM cancel_unpaid_allocations()`);
      const cancelledCount = result.rows[0]?.cancelled_count ?? 0;

      console.log("Task completed: Cancel unpaid allocations - Success. Cancelled", cancelledCount, "allocation(s).");

      if (Number(cancelledCount) > 0) {
        const { logAudit } = await auditLogQueries();

        const ctx = getAuditContext({
          kind: "system",
          companyId: null,
        });

        await logAudit(db, ctx, {
          action: "allocation.cancel_unpaid",
          actionType: "CANCEL_ALLOCATION",
          entityType: "allocation",
          description: `System cancelled ${cancelledCount} unpaid allocation(s) due to timeout.`,
          before: null,
          after: { cancelledCount },
        });
      }

      return { result: `Success. Cancelled ${cancelledCount} allocation(s).` };
    }
    catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) throw error;
      handleError(error, "Cancel Unpaid Allocations");
    }
  },
});
