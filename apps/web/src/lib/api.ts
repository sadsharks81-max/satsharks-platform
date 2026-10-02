import type { ApiResponse } from "@satsharks/types";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// All requests go to this origin; Next.js forwards /api/* to the Express API (see next.config.ts).
export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const response = await fetch(path, {
    method: init?.method ?? "GET",
    credentials: "same-origin",
    headers: init?.body === undefined ? undefined : { "Content-Type": "application/json" },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  });

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    // Non-JSON body, e.g. the API is down and the proxy answered with an HTML error page.
  }

  if (payload?.ok) return payload.data;
  throw new ApiError(
    response.status,
    payload && !payload.ok ? payload.error.code : "network_error",
    payload && !payload.ok ? payload.error.message : "The server could not be reached. Please try again.",
  );
}
