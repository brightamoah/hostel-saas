import { auditEnricher, auditOnly, signed } from "evlog";
import { createAxiomDrain } from "evlog/axiom";
import { createFsDrain } from "evlog/fs";

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook("evlog:enrich", auditEnricher());
  nitro.hooks.hook("evlog:drain", createAxiomDrain());
  nitro.hooks.hook("evlog:drain", auditOnly(
    signed(createFsDrain({ dir: ".audit" }), { strategy: "hash-chain" }),
    { await: true },
  ));
});
