import { sql } from "drizzle-orm";
import { createError, createLogger } from "evlog";

import { auditLogQueries } from "../db/queries/auditLog";

export default defineTask({
  meta: {
    name: "cancelUnpaidAllocations",
    description: "Cancel pending allocations without 60% payment after 3 days",
  },
  async run() {
    const log = createLogger({
      task: "cancelUnpaidAllocations",
      service: "scheduler",
    });

    try {
      const { db } = useDB();

      const thresholdDate = new Date();

      thresholdDate.setDate(thresholdDate.getDate() - 3);
      const thresholdIso = thresholdDate.toISOString();

      log.set({
        taskStatus: "fetching_pending_allocations",
        thresholdDate: thresholdIso,
      });

      const result = await db.execute(sql`SELECT * FROM cancel_unpaid_allocations()`);

      const cancelledCount = result[0]?.cancelled_count ?? 0;

      log.set({
        cancelledCount,
        taskStatus: "completed",
      });
      log.emit();

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

      return {
        result: `Success. Cancelled ${cancelledCount} allocation(s).`,
      };
    }
    catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) {
        log.set({ taskStatus: "failed" });
        log.emit();
        throw error;
      }
      log.set({ taskStatus: "failed" });
      log.emit();
      handleError(createError({
        cause: error as Error,
        message: "Failed to cancel unpaid allocations",
        why: "An error occurred while executing the database query or audit log insertion.",
        fix: "Check the database connection, query logic, or audit log configuration.",
      }), "Cancel Unpaid Allocations");
    }
  },
});
