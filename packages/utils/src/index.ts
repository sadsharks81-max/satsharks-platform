type LogLevel = "debug" | "info" | "warn" | "error";

// Keys whose values must never reach the logs.
const REDACTED_KEYS = /pass(word)?|secret|token|authorization|cookie|apikey|api_key/i;

function redact(value: unknown, depth = 0): unknown {
  if (value === null || typeof value !== "object" || depth > 4) return value;
  if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack };
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value)) {
    out[key] = REDACTED_KEYS.test(key) ? "[redacted]" : redact(inner, depth + 1);
  }
  return out;
}

export interface Logger {
  debug(message: string, meta?: unknown): void;
  info(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
}

export function createLogger(scope: string): Logger {
  const write = (level: LogLevel, message: string, meta?: unknown) => {
    const line = JSON.stringify({
      time: new Date().toISOString(),
      level,
      scope,
      message,
      ...(meta === undefined ? {} : { meta: redact(meta) }),
    });
    if (level === "error" || level === "warn") console.error(line);
    else console.log(line);
  };
  return {
    debug: (message, meta) => write("debug", message, meta),
    info: (message, meta) => write("info", message, meta),
    warn: (message, meta) => write("warn", message, meta),
    error: (message, meta) => write("error", message, meta),
  };
}

export function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// "" and whitespace-only strings are treated as missing.
export function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}
