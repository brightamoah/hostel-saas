/// <reference types="@cloudflare/workers-types" />

interface CloudflareEnv {
  KV: KVNamespace;
  R2: R2Bucket;
  HYPERDRIVE: Hyperdrive;
}

declare module "h3" {
  interface H3EventContext {
    cloudflare: {
      env: CloudflareEnv;
      cf: {
        requestId: string;
        cfRay: string;
      };
    };
  }
}

export {};
