import { createLogger } from "evlog";
import { consolidateDailyLogs } from "../utils/evlogR2";

export default defineTask({
  meta: {
    name: "consolidateLogs",
    description: "Consolidates raw daily evlog files into logs/YYYY/MM/DD.jsonl and removes logs older than 30 days.",
  },
  async run({ context, payload }) {
    const log = createLogger();
    log.set({
      task: "consolidateLogs",
      taskStatus: "started",
    });

    try {
      const {
        processedChunksCount,
        consolidatedDatesCount,
      } = await consolidateDailyLogs(context, {
        includeToday: (payload as { includeToday?: boolean } | undefined)?.includeToday,
      });

      log.set({
        taskStatus: "completed",
        processedChunksCount,
        consolidatedDatesCount,
      });

      log.emit();

      return {
        result: `Daily logs consolidated. Processed ${processedChunksCount} raw chunk(s) across ${consolidatedDatesCount} date(s). Expired logs cleaned up.`,
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
