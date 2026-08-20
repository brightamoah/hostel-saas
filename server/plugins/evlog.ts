import { auditEnricher, auditOnly, signed } from "evlog";
import { createFsDrain } from "evlog/fs";

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook("evlog:enrich", auditEnricher());

  if (import.meta.dev) {
    nitro.hooks.hook("evlog:drain", auditOnly(
      signed(createFsDrain({
        dir: ".audit",
      }), {
        strategy: "hash-chain",
      }),
      { await: true },
    ));
  }
});
