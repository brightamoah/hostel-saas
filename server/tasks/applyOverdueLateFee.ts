import { and, eq, inArray } from "drizzle-orm";
import { createError, createLogger } from "evlog";

import { auditLogQueries } from "../db/queries/auditLog";
import { allocation, billing, companySettings } from "../db/schema";

export default defineTask({
  meta: {
    name: "applyOverdueLateFee",
    description: "Apply late fees to overdue billings based on company settings (frequency, grace period)",
  },
  async run({ context }) {
    const { db } = useDB(context);

    const log = createLogger({
      task: "applyOverdueLateFee",
      service: "scheduler",
    });

    log.set({ taskStatus: "started" });

    try {
      const overdueBillings = await db
        .select({
          billingId: billing.id,
          amount: billing.amount,
          dueDate: billing.dueDate,
          companyId: billing.companyId,
          lateFee: billing.lateFee,
        })
        .from(billing)
        .innerJoin(allocation, eq(billing.allocationId, allocation.id))
        .where(
          and(
            eq(billing.status, "overdue"),
            inArray(allocation.status, ["active", "pending"]),
          ),
        );

      if (overdueBillings.length === 0) {
        log.set({ taskStatus: "completed", message: "No overdue billings to process." });
        log.emit();
        return { result: "No overdue billings to process." };
      }

      const companyIds = [...new Set(overdueBillings.map(billing => billing.companyId))];
      const settings = await db
        .select()
        .from(companySettings)
        .where(inArray(companySettings.companyId, companyIds));

      const settingsMap = new Map(settings.map(setting => [setting.companyId, setting]));

      let updatedCount = 0;
      let totalFees = 0;

      for (const b of overdueBillings) {
        const companySettings = settingsMap.get(b.companyId);

        if (!companySettings || !companySettings.lateFeeEnabled) continue;

        const dueDate = new Date(b.dueDate);
        const graceEnd = new Date(dueDate);
        graceEnd.setDate(graceEnd.getDate() + companySettings.lateFeeGracePeriodDays);

        const now = new Date();
        if (now > graceEnd) {
          const daysOverdue = Math.floor((now.getTime() - graceEnd.getTime()) / (1000 * 60 * 60 * 24));

          let multiplier = 1;
          const frequency = companySettings.lateFeeFrequency || "one-time";

          if (frequency === "daily") {
            multiplier = daysOverdue + 1;
          }
          else if (frequency === "weekly") {
            multiplier = Math.floor(daysOverdue / 7) + 1;
          }
          else if (frequency === "monthly") {
            multiplier = Math.floor(daysOverdue / 30) + 1;
          }

          let baseFee = 0;
          const amt = Number(b.amount);

          if (companySettings.lateFeeType === "flat") {
            baseFee = Number(companySettings.lateFeeValue);
          }
          else if (companySettings.lateFeeType === "percent") {
            baseFee = amt * (Number(companySettings.lateFeeValue) / 100);
          }

          const totalExpectedFee = baseFee * multiplier;
          const currentFee = Number(b.lateFee || 0);

          if (totalExpectedFee > 0 && totalExpectedFee !== currentFee) {
            await db
              .update(billing)
              .set({
                lateFee: totalExpectedFee.toFixed(2),
                updatedAt: new Date(),
              })
              .where(eq(billing.id, b.billingId));

            updatedCount++;
            // Calculate the delta added so we can log it
            const addedFee = totalExpectedFee - currentFee;
            totalFees += addedFee;
          }
        }
      }

      log.set({
        updatedCount,
        totalFees,
        taskStatus: "completed",
        message: "Apply late fees success",
      });
      log.emit();

      if (updatedCount > 0) {
        const { logAudit } = await auditLogQueries();

        const ctx = getAuditContext({
          kind: "system",
          companyId: null,
        });

        await logAudit(db, ctx, {
          action: "billing.apply_cumulative_late_fees",
          actionType: "UPDATE",
          entityType: "billing",
          description: `System applied cumulative late fees to ${updatedCount} overdue billing(s). Additional fees applied: ${totalFees}`,
          before: null,
          after: { updatedCount, totalFeesAdded: totalFees },
        });
      }

      return {
        result: `Success. Applied late fees to ${updatedCount} billing(s). Total: ${totalFees}`,
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
        message: "Failed to apply overdue late fees",
        why: "An error occurred while executing the database query or audit log insertion.",
        fix: "Check the database connection, query logic, or audit log configuration.",
      }), "Apply Overdue Late Fees");
    }
  },
});
