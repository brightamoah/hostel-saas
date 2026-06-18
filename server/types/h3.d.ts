/// <reference types="@cloudflare/workers-types" />

declare global {
  interface CloudflareEnv {
    STORAGE: KVNamespace;
    BUCKET: R2Bucket;
    HYPERDRIVE: Hyperdrive;
  }

  interface CloudflareContext {
    cloudflare?: {
      env: CloudflareEnv;
    };
  }

  interface GlobalEnv {
    __env__?: {
      HYPERDRIVE?: {
        connectionString: string;
      };
    };
  }
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

declare module "nitropack" {
  interface TaskContext extends CloudflareContext {}
}

export {};
