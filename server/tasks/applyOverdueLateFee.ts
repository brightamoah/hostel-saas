/* eslint-disable no-console */
import { sql } from "drizzle-orm";

import { auditLogQueries } from "../db/queries/auditLog";

export default defineTask({
  meta: {
    name: "applyOverdueLateFee",
    description: "Apply 5% weekly late fee to overdue billings",
  },
  async run() {
    const { db } = useDB();

    console.log("Running task: Apply weekly late fees...");

    try {
      const result = await db.execute(sql`SELECT * FROM apply_weekly_late_fees()`);
      const updatedCount = result.rows[0]?.updated_count ?? 0;
      const totalFees = result.rows[0]?.total_late_fees ?? 0;

      console.log("Task completed: Apply weekly late fees - Success. Updated", updatedCount, "billing(s). Total late fees applied:", totalFees);

      if (Number(updatedCount) > 0) {
        const { logAudit } = await auditLogQueries();

        const ctx = getAuditContext({
          kind: "system",
          companyId: null,
        });

        await logAudit(db, ctx, {
          action: "billing.apply_weekly_late_fees",
          actionType: "UPDATE",
          entityType: "billing",
          description: `System applied weekly late fees to ${updatedCount} overdue billing(s). Total fees applied: ${totalFees}`,
          before: null,
          after: { updatedCount, totalFees },
        });
      }

      return {
        result: `Success. Applied late fees to ${updatedCount} billing(s). Total: ${totalFees}`,
      };
    }
    catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) throw error;
      handleError(error, "Apply Overdue Late Fees");
    }
  },
});
