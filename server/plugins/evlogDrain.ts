import type { DrainContext } from "evlog";

import { createAxiomDrain } from "evlog/axiom";
import { createDrainPipeline } from "evlog/pipeline";

const pipeline = createDrainPipeline<DrainContext>({
  batch: { size: 50, intervalMs: 5000 },
  retry: { maxAttempts: 3 },
});
const drain = pipeline(createAxiomDrain());

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("evlog:drain", drain);
});
