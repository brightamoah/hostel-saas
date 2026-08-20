import type { DrainContext } from "evlog";
import { initLogger } from "evlog";

import { createDrainPipeline } from "evlog/pipeline";
import { createR2Drain } from "../utils/evlogR2";

const pipeline = createDrainPipeline<DrainContext>({
  batch: {
    size: 50,
    intervalMs: 5000,
  },
  retry: {
    maxAttempts: 3,
  },
});

const drain = pipeline(createR2Drain());

export default defineNitroPlugin((nitroApp) => {
  initLogger({
    redact: true,
  });

  nitroApp.hooks.hook("evlog:drain", drain);
});
