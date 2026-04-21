/* eslint-disable node/no-process-env */

import * as z from "zod";

import tryParseEnv from "./tryParseEnv";

const fullSchema = z.object({
  // NUXT_PLATFORM_SEED_SECRET: z.string(),
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  NUXT_SESSION_PASSWORD: z.string(),
  NUXT_SESSION_NAME: z.string(),
  NUXT_ADMIN_SESSION_NAME: z.string(),
  NUXT_ADMIN_SESSION_PASSWORD: z.string(),
  NUXT_DATABASE_URL: z.string(),
  NUXT_EMAIL_FROM_NAME: z.string(),
  NUXT_EMAIL_FROM_EMAIL: z.email(),
  NUXT_PUBLIC_SITE_URL: z.url(),
  NUXT_KV_NAMESPACE_ID: z.string().optional(),
  NUXT_KV_PREVIEW_NAMESPACE_ID: z.string().optional(),
  NUXT_PAYSTACK_SECRET_KEY: z.string(),
  NUXT_PAYSTACK_PUBLIC_KEY: z.string(),
  NUXT_PAYSTACK_BASE_URL: z.url(),
  NUXT_PUBLIC_ADMIN_BASE_URL: z.url(),
  NUXT_PUBLIC_SITE_BASE_URL: z.url(),
  NUXT_R2_BUCKET_NAME: z.string(),
  NUXT_R2_PREVIEW_BUCKET_NAME: z.string(),
  NUXT_NODEMAILER_FROM: z.string(),
  NUXT_NODEMAILER_HOST: z.string(),
  NUXT_NODEMAILER_PORT: z.coerce.number(),
  NUXT_NODEMAILER_AUTH_USER: z.string(),
  NUXT_NODEMAILER_AUTH_PASS: z.string(),
  NUXT_R2_ENDPOINT: z.string(),
  NUXT_R2_ACCESS_KEY_ID: z.string(),
  NUXT_R2_SECRET_ACCESS_KEY: z.string(),
  NUXT_R2_URL: z.url(),
});

tryParseEnv(fullSchema);

export type EnvSchema = z.infer<typeof fullSchema>;
export const env = fullSchema.parse(process.env) as EnvSchema;
