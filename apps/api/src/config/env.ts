import { getEnv } from "@satsharks/config";

export const env = getEnv();
export const isProduction = env.NODE_ENV === "production";

export const AUTH_COOKIE_NAME = "ss_token";
export const AUTH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
export const BCRYPT_ROUNDS = 12;
