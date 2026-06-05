import { createLogger } from "evlog";

export default defineTask({
  meta: {
    name: "schedular",
    description: "Runs scheduled tasks at specified intervals",
  },

  async run() {
    const log = createLogger();
    log.set({
      task: "schedular",
      taskStatus: "started",
    });

    try {
      await runTask("clearExpiredCache");
      await runTask("checkOverdueBillings");
      await runTask("cancelUnpaidAllocations");

      // Weekly task
      const now = new Date();
      const isSunday = now.getUTCDay() === 0;
      const is1am = now.getUTCHours() === 1;

      if (isSunday && is1am) {
        await runTask("applyOverdueLateFee");
      }

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
