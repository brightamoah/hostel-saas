// https://nuxt.com/docs/api/configuration/nuxt-config
import { env } from "./app/lib/env";

// const isAdmin =

export default defineNuxtConfig({
  compatibilityDate: "latest",
  modules: [
    "nuxt-security",
    "@nuxt/eslint",
    "@nuxtjs/seo",
    "@nuxt/image",
    "@nuxt/ui",
    "@pinia/nuxt",
    "nuxt-auth-utils",
    "@formkit/auto-animate",
    "nuxt-tiptap-editor",
    "evlog/nuxt",
  ],

  $development: {
    modules: ["nuxt-nodemailer"],

    runtimeConfig: {
      public: {
        siteUrl: "http://localhost:3000",
      },
    },

    nitro: {
      preset: "nitro-dev",
    },

    nodemailer: {
      from: env.NUXT_NODEMAILER_FROM,
      host: env.NUXT_NODEMAILER_HOST,
      port: env.NUXT_NODEMAILER_PORT,
      secure: true,
      auth: {
        user: env.NUXT_NODEMAILER_AUTH_USER,
        pass: env.NUXT_NODEMAILER_AUTH_PASS,
      },
    },

    security: {
      csrf: true,
      rateLimiter: {
        driver: {
          name: "lruCache",
        },
        tokensPerInterval: 200,
        interval: 60 * 1000,
      },
      headers: {
        contentSecurityPolicy: {
          "img-src": [
            "http:",
          ],
        },
      },
    },

    routeRules: {
      "/_nitro/tasks/**": {
        security: {
          csrf: false,
        },
      },
      "/_nitro/**": {
        security: {
          csrf: false,
        },
      },
      "/api/upload/**": {
        security: {
          requestSizeLimiter: {
            maxRequestSizeInBytes: 100 * 1024 * 1024,
            maxUploadFileRequestInBytes: 100 * 1024 * 1024,
          },
        },
      },
    },

    site: {
      url: env.NUXT_PUBLIC_SITE_URL,
      name: env.NUXT_EMAIL_FROM_NAME,
    },
  },

  devtools: { enabled: true },

  app: {
    pageTransition: { name: "page", mode: "out-in" },
    head: {
      link: [
        { rel: "icon", type: "image/svg+xml", href: "/logo.svg" },
      ],
      titleTemplate: `%s - ${env.NUXT_EMAIL_FROM_NAME}`,
    },
  },

  css: ["~/assets/css/main.css"],

  // image: {
  //   domains: ["localhost", "res.cloudinary.com", "images.unsplash.com", env.NUXT_PUBLIC_SITE_BASE_URL, env.NUXT_PUBLIC_SITE_URL, env.NUXT_PUBLIC_ADMIN_BASE_URL],
  //   alias: {
  //     api: "/api/images",
  //   },
  //   ipx:{
  //     modifiers:{

  //     }
  //   }
  // },

  nitro: {
    preset: "cloudflare_module",
    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
      dev: {
        environment: "preview",
      },
      wrangler: {
        kv_namespaces: [
          {
            binding: "KV",
            id: env.NUXT_KV_NAMESPACE_ID,
            preview_id: env.NUXT_KV_PREVIEW_NAMESPACE_ID,
          },
          {
            binding: "CACHE",
            id: env.NUXT_KV_NAMESPACE_ID,
            preview_id: env.NUXT_KV_PREVIEW_NAMESPACE_ID,
          },
        ],
        r2_buckets: [
          {
            binding: "BUCKET",
            bucket_name: env.NUXT_R2_BUCKET_NAME,
            preview_bucket_name: env.NUXT_R2_PREVIEW_BUCKET_NAME,
          },
        ],
      },
    },
    rollupConfig: {
      external: [
        "cloudflare:sockets",
      ],
    },
    experimental: {
      tasks: true,
      openAPI: true,
    },
    scheduledTasks: {
      "0 0 * * *": ["schedular"],
    },
    devStorage: {
      kv: {
        driver: "fs-lite",
        base: "./.data/kv",
      },
      images: {
        driver: "s3",
        accessKeyId: env.NUXT_R2_ACCESS_KEY_ID,
        secretAccessKey: env.NUXT_R2_SECRET_ACCESS_KEY,
        endpoint: env.NUXT_R2_ENDPOINT,
        bucket: env.NUXT_R2_PREVIEW_BUCKET_NAME,
        region: "auto",
      },
    },
    storage: {
      kv: {
        driver: "cloudflare-kv-binding",
        options: {
          binding: "KV",
        },
      },
      images: {
        driver: "cloudflare-r2-binding",
        options: {
          binding: "BUCKET",
        },
      },
    },
  },

  runtimeConfig: {
    public: {
      siteUrl: env.NUXT_PUBLIC_SITE_URL,
      paystackPublicKey: env.NUXT_PAYSTACK_PUBLIC_KEY,
      paystackBaseUrl: env.NUXT_PAYSTACK_BASE_URL,
      adminBaseUrl: env.NUXT_PUBLIC_ADMIN_BASE_URL,
      siteBaseUrl: env.NUXT_PUBLIC_SITE_BASE_URL,

    },
    session: {
      password: env.NUXT_SESSION_PASSWORD,
      name: env.NUXT_SESSION_NAME,
      cookie: {
        maxAge: 60 * 60 * 24 * 1, // 1 day in seconds
      },
    },
    sessionName: env.NUXT_SESSION_NAME,
    sessionPassword: env.NUXT_SESSION_PASSWORD,
    adminSessionName: env.NUXT_ADMIN_SESSION_NAME,
    adminSessionPassword: env.NUXT_ADMIN_SESSION_PASSWORD,
    databaseUrl: env.NUXT_DATABASE_URL,
    nodemailerFrom: env.NUXT_NODEMAILER_FROM,
    nodemailerHost: env.NUXT_NODEMAILER_HOST,
    nodemailerPort: env.NUXT_NODEMAILER_PORT ? String(env.NUXT_NODEMAILER_PORT) : undefined,
    nodemailerAuthUser: env.NUXT_NODEMAILER_AUTH_USER,
    nodemailerAuthPass: env.NUXT_NODEMAILER_AUTH_PASS,
    emailFromName: env.NUXT_EMAIL_FROM_NAME,
    emailFromEmail: env.NUXT_EMAIL_FROM_EMAIL,
    nodeEnv: env.NODE_ENV,
    paystackSecretKey: env.NUXT_PAYSTACK_SECRET_KEY,
    r2Url: env.NUXT_R2_URL,
    // platformSeedSecret: env.NUXT_PLATFORM_SEED_SECRET,

  },

  experimental: {
    typedPages: true,
    typescriptPlugin: true,
    viteEnvironmentApi: true,
  },

  eslint: {
    config: {
      standalone: false,
    },
  },

  routeRules: {
    "/_nitro/tasks/**": {
      security: {
        csrf: false,
      },
    },
    "/api/announcement/**": {
      security: {
        xssValidator: false,
      },
    },
    "/_nitro/**": {
      security: {
        csrf: false,
      },
    },
    "/api/_images/**": {
      security: {
        rateLimiter: false,
      },
    },
    "/api/images/**": {
      security: {
        rateLimiter: false,
      },
    },
    "/_ipx/**": {
      security: {
        rateLimiter: false,
      },
    },
    "/api/_auth/**": {
      security: {
        rateLimiter: false,
      },
    },
    "/api/upload/**": {
      security: {
        requestSizeLimiter: {
          maxRequestSizeInBytes: 100 * 1024 * 1024,
          maxUploadFileRequestInBytes: 100 * 1024 * 1024,
        },
      },
    },
  },

  security: {
    csrf: true,
    rateLimiter: {
      driver: {
        name: "lruCache",
      },
      tokensPerInterval: 100,
    },
    headers: {
      contentSecurityPolicy: {
        "img-src": [
          "'self'",
          "data:",
          "blob:",
          "https:",
        ],
        "worker-src": ["'self'", "blob:"],
        "script-src": [
          "'self'",
          "'unsafe-inline'",
          "https://js.paystack.co",
          "https://*.paystack.com",
          "https://*.paystack.co",
          "https://api.iconify.design/",
          "https://static.cloudflareinsights.com",
        ],
        "frame-src": [
          "'self'",
          "https://checkout.paystack.com",
          "https://*.paystack.com",
          "https://*.paystack.co",
          "https://api.iconify.design/",
          "blob:",
          "data:",
        ],
        "connect-src": [
          "'self'",
          "https://api.paystack.co",
          "https://*.paystack.co",
          "https://*.paystack.com",
          "https://*.browser-intake-datadoghq.com",
          "https://api.iconify.design/",
          "https://static.cloudflareinsights.com",
        ],
        "script-src-attr": ["'unsafe-inline'"],
      },
    },
  },

  site: {
    url: env.NUXT_PUBLIC_SITE_URL,
    name: env.NUXT_EMAIL_FROM_NAME,
  },

  // sitemap: {
  //   zeroRuntime: false,
  // },
  ogImage: {
    enabled: false,
  },

  hooks: {
    "nitro:config": (nitroConfig) => {
      nitroConfig.handlers = nitroConfig.handlers?.filter(handler => handler?.route !== "/api/_auth/session");
    },
  },
});
