import { createLogger } from "evlog";
import { consolidateDailyLogs } from "../utils/evlogR2";

export default defineTask({
  meta: {
    name: "consolidateLogs",
    description: "Consolidates raw daily evlog files into logs/YYYY/MM/DD.jsonl and removes logs older than 30 days.",
  },
  async run() {
    const log = createLogger();
    log.set({
      task: "consolidateLogs",
      taskStatus: "started",
    });

    try {
      await consolidateDailyLogs();

      log.set({
        taskStatus: "completed",
      });

      log.emit();

      return { result: "Daily logs consolidated and expired logs cleaned up." };
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
