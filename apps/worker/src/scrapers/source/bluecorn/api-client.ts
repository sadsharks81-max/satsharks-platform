// Live access to Bluecorn's RPC API, using a session token that the account owner copied from
// their own logged-in browser. It never logs in and never touches the captcha: when the token
// expires, it stops and asks for a new one.
//
// Requests are sequential and spaced out, so the load is far below what one person browsing
// the site produces.

export type Rpc = (fn: string, body: Record<string, unknown>) => Promise<unknown>;

export class SourceAuthError extends Error {}

export interface ApiClientOptions {
  apiHost: string;
  apiKey: string;
  accessToken: string;
  delayMs: number;
  onCall?: (fn: string) => void;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const MAX_ATTEMPTS = 4;

// Reads the expiry out of the token so an expired one is reported before any request is made.
export function tokenExpiry(accessToken: string): Date | null {
  try {
    const payload = JSON.parse(Buffer.from(accessToken.split(".")[1] ?? "", "base64url").toString("utf8")) as { exp?: unknown };
    return typeof payload.exp === "number" ? new Date(payload.exp * 1000) : null;
  } catch {
    return null;
  }
}

export function createRpc(options: ApiClientOptions): Rpc {
  let lastCallAt = 0;

  return async (fn, body) => {
    for (let attempt = 1; ; attempt++) {
      const wait = lastCallAt + options.delayMs - Date.now();
      if (wait > 0) await sleep(wait);
      lastCallAt = Date.now();
      options.onCall?.(fn);

      const response = await fetch(`https://${options.apiHost}/rest/v1/rpc/${fn}`, {
        method: "POST",
        headers: {
          apikey: options.apiKey,
          authorization: `Bearer ${options.accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60_000),
      });

      if (response.ok) return response.status === 204 ? null : ((await response.json()) as unknown);

      const detail = (await response.text()).slice(0, 300);
      if (response.status === 401 || response.status === 403 || /JWT|token.*expired/i.test(detail)) {
        throw new SourceAuthError(`The source rejected the session token (${response.status}). Copy a fresh one into SOURCE_ACCESS_TOKEN and run the command again; finished work is kept.`);
      }
      // Back off on rate limiting and server errors. Anything else is a real error.
      if ((response.status === 429 || response.status >= 500) && attempt < MAX_ATTEMPTS) {
        await sleep(options.delayMs * 2 ** attempt * 2);
        continue;
      }
      throw new Error(`${fn} failed with ${response.status}: ${detail}`);
    }
  };
}
