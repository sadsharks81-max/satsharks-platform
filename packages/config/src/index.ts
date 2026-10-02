import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

// packages/config/src -> repo root
export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);
const optionalString = z.preprocess(emptyToUndefined, z.string().optional());

const envSchema = z.object({
  NODE_ENV: z.preprocess(emptyToUndefined, z.enum(["development", "test", "production"]).default("development")),
  PORT: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().default(4000)),
  CLIENT_URL: z.preprocess(emptyToUndefined, z.string().url().default("http://localhost:3000")),
  JWT_SECRET: optionalString,
  MONGODB_URI: optionalString,
  REDIS_URL: optionalString,
  STORAGE_ENDPOINT: optionalString,
  STORAGE_BUCKET: optionalString,
  STORAGE_ACCESS_KEY: optionalString,
  STORAGE_SECRET_KEY: optionalString,
  SOURCE_NAME: z.preprocess(emptyToUndefined, z.string().default("bluecorn")),
  SOURCE_API_HOST: z.preprocess(emptyToUndefined, z.string().default("ciao.bluebooky.org")),
  SOURCE_API_KEY: optionalString,
  SOURCE_ACCESS_TOKEN: optionalString,
  SOURCE_REQUEST_DELAY_MS: z.preprocess(emptyToUndefined, z.coerce.number().int().min(500).default(1500)),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  dotenv.config({ path: path.join(REPO_ROOT, ".env") });
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

// Secrets are optional at load time so that tools which do not need them (e.g. a dry-run import)
// still start. Code that needs one asks for it here and fails with a clear message.
export function requireEnv<K extends keyof Env>(key: K): NonNullable<Env[K]> {
  const value = getEnv()[key];
  if (value === undefined || value === null || value === "") {
    throw new Error(`${key} is not set. Add it to .env (see .env.example).`);
  }
  return value as NonNullable<Env[K]>;
}

export function getJwtSecret(): string {
  const secret = requireEnv("JWT_SECRET");
  if (secret.length < 32) throw new Error("JWT_SECRET must be at least 32 characters.");
  return secret;
}
