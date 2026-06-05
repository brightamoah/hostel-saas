import { createLogger } from "evlog";

export default defineTask({
  meta: {
    name: "clearExpiredCache",
    description: "Clears expired cache entries from the key-value store.",
  },
  async run() {
    const log = createLogger();
    log.set({
      task: "clearExpiredCache",
      taskStatus: "started",
    });

    try {
      await cleanupExpiredKV("nuxt:icon");

      log.set({
        taskStatus: "completed",
      });
      log.emit();
      return { result: "Expired cache entries cleared." };
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
