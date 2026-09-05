import type { DrainContext } from "evlog";
import { initLogger } from "evlog";

import { createDrainPipeline } from "evlog/pipeline";
import { createR2Drain } from "../utils/evlogR2";

const pipeline = createDrainPipeline<DrainContext>({
  batch: {
    size: 10,
    intervalMs: 5000,
  },
  retry: {
    maxAttempts: 3,
    backoff: "exponential",
    initialDelayMs: 1000,
    maxDelayMs: 30000,
  },
  maxBufferSize: 1000,
  onDropped: (events, error) => {
    console.error(`[evlog] Dropped ${events.length} events:`, error?.message);
  },
});

const drain = pipeline(createR2Drain());

export default defineNitroPlugin((nitroApp) => {
  initLogger({
    redact: true,
  });

  nitroApp.hooks.hook("evlog:drain", drain);
  nitroApp.hooks.hook("close", () => drain.flush());

  nitroApp.hooks.hook("afterResponse", (event) => {
    const waitUntil
      = event.context.cloudflare?.context?.waitUntil?.bind(event.context.cloudflare.context)
        ?? event.context.waitUntil?.bind(event.context);

    if (typeof waitUntil === "function" && drain.pending > 0) {
      waitUntil(drain.flush());
    }
  });
});
