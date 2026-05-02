import { auditEnricher, auditOnly, signed } from "evlog";
import { createAxiomDrain } from "evlog/axiom";
import { createFsDrain } from "evlog/fs";
import { createSentryDrain } from "evlog/sentry";

export default defineNitroPlugin((nitro) => {
  const config = useRuntimeConfig();

  nitro.hooks.hook("evlog:enrich", auditEnricher());

  nitro.hooks.hook("evlog:drain", createSentryDrain({
    dsn: config.sentryDsn,
    environment: config.nodeEnv,
  }));

  nitro.hooks.hook("evlog:drain", createAxiomDrain({
    dataset: config.axiomDataset,
    token: config.axiomToken,
  }));

  if (import.meta.dev) {
    nitro.hooks.hook("evlog:drain", auditOnly(
      signed(createFsDrain({ dir: ".audit" }), { strategy: "hash-chain" }),
      { await: true },
    ));
  }
});
