import { createLogger } from "evlog";

export default defineTask({
  meta: {
    name: "schedular",
    description: "Runs scheduled tasks at specified intervals",
  },

  async run({ context }) {
    const log = createLogger();
    log.set({
      task: "schedular",
      taskStatus: "started",
    });

    try {
      await runTask("consolidateLogs", { context });
      await runTask("residencyResetExpired", { context });
      await runTask("clearExpiredCache", { context });
      await runTask("checkOverdueBillings", { context });
      await runTask("cancelUnpaidAllocations", { context });
      await runTask("processBillingReminders", { context });

      // Weekly task
      const now = new Date();
      const isSunday = now.getUTCDay() === 0;
      // const is1am = now.getUTCHours() === 1;

      if (isSunday) await runTask("applyOverdueLateFee", { context });

      log.set({ taskStatus: "completed" });
      log.emit();
      return {
        result: "Scheduled tasks executed successfully.",
      };
    }
    catch (error) {
      log.set({
        taskStatus: "failed",
        error: (error as Error).message,
      });
      log.emit();
      throw error;
    }
  },
});
