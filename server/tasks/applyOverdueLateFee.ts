/* eslint-disable no-console */
import { and, eq, inArray } from "drizzle-orm";

import { auditLogQueries } from "../db/queries/auditLog";
import { allocation, billing, companySettings } from "../db/schema";

export default defineTask({
  meta: {
    name: "applyOverdueLateFee",
    description: "Apply 5% weekly late fee to overdue billings",
  },
  async run() {
    const { db } = useDB();

    console.log("Running task: Apply weekly late fees...");

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
            eq(billing.lateFee, "0.00"),
          ),
        );

      if (overdueBillings.length === 0) {
        console.log("No overdue billings to process.");
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

        if (new Date() > graceEnd) {
          let fee = 0;
          const amt = Number(b.amount);

          if (companySettings.lateFeeType === "flat") fee = Number(companySettings.lateFeeValue);

          else if (companySettings.lateFeeType === "percent") fee = amt * (Number(companySettings.lateFeeValue) / 100);

          if (fee > 0) {
            await db
              .update(billing)
              .set({
                lateFee: fee.toFixed(2),
                updatedAt: new Date(),
              })
              .where(eq(billing.id, b.billingId));

            updatedCount++;
            totalFees += fee;
          }
        }
      }

      console.log("Task completed: Apply late fees - Success. Updated", updatedCount, "billing(s). Total late fees applied:", totalFees);

      if (updatedCount > 0) {
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
