import { and, inArray, sql } from "drizzle-orm";
import { createError, createLogger } from "evlog";

import { auditLogQueries } from "../db/queries/auditLog";
import { billing } from "../db/schema";

export default defineTask({
  meta: {
    name: "checkOverdueBillings",
    description: "Mark unpaid and partially paid bills as overdue if past their due date",
  },
  async run({ context }) {
    const { db } = useDB(context);

    const log = createLogger({
      task: "checkOverdueBillings",
      service: "scheduler",
    });

    log.set({ taskStatus: "started" });

    try {
      const result = await db
        .update(billing)
        .set({
          status: "overdue",
          updatedAt: new Date(),
        })
        .where(and(
          sql`DATE(${billing.dueDate}) < CURRENT_DATE`,
          inArray(billing.status, ["unpaid", "partially paid"]),
        ))
        .returning({ id: billing.id }); ;

      const count = result.length;
      log.set({ count, taskStatus: "completed" });
      log.emit();

      if (Number(count) > 0) {
        const { logAudit } = await auditLogQueries();

        const ctx = getAuditContext({
          kind: "system",
          companyId: null,
        });

        await logAudit(db, ctx, {
          action: "billing.mark_overdue",
          actionType: "STATUS_CHANGE",
          entityType: "billing",
          description: `System marked ${count} bill(s) as overdue.`,
          before: null,
          after: { updatedIds: result.map(r => r.id) },
        });
      }

      return { result: `Success. Marked ${count} bill(s) as overdue.` };
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
        message: "Failed to check overdue billings",
        why: "An error occurred while executing the database query or audit log insertion.",
        fix: "Check the database connection, query logic, or audit log configuration.",
      }), "Check Overdue Billings");
    }
  },
});
