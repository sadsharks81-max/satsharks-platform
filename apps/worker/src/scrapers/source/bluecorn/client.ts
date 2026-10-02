// Source access layer for Bluecorn.
//
// Bluecorn's data sits behind a login protected by a captcha, so this client does not talk to the
// site. It reads a HAR file recorded by a person using the site normally, and returns the RPC
// calls the site's own app made. If a network-based client is ever permitted, it replaces this
// file only: everything downstream consumes RpcCall[].
import fs from "node:fs";

export interface RpcCall {
  // Position in the HAR, which is chronological.
  index: number;
  startedAt: string;
  fn: string;
  status: number;
  request: unknown;
  response: unknown;
}

interface HarEntry {
  startedDateTime?: string;
  request?: { url?: string; method?: string; postData?: { text?: string } };
  response?: { status?: number; content?: { text?: string; encoding?: string } };
}

const RPC_PATH = /\/rest\/v1\/rpc\/([A-Za-z0-9_]+)$/;

function parseJson(text: string | undefined): unknown {
  if (text === undefined || text === "") return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// Only bodies are kept. Headers (API key, cookies, auth tokens) are never read into the result.
export function readRpcCalls(harPath: string, apiHost: string): RpcCall[] {
  const har = JSON.parse(fs.readFileSync(harPath, "utf8")) as { log?: { entries?: HarEntry[] } };
  const entries = har.log?.entries;
  if (!Array.isArray(entries)) throw new Error(`${harPath} is not a HAR file (log.entries is missing)`);

  const calls: RpcCall[] = [];
  entries.forEach((entry, index) => {
    const rawUrl = entry.request?.url;
    if (!rawUrl || entry.request?.method !== "POST") return;
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      return;
    }
    if (url.host !== apiHost) return;
    const match = RPC_PATH.exec(url.pathname);
    if (!match?.[1]) return;

    const content = entry.response?.content;
    const body =
      content?.encoding === "base64" && content.text
        ? Buffer.from(content.text, "base64").toString("utf8")
        : content?.text;

    calls.push({
      index,
      startedAt: entry.startedDateTime ?? "",
      fn: match[1],
      status: entry.response?.status ?? 0,
      request: parseJson(entry.request?.postData?.text),
      response: parseJson(body),
    });
  });
  return calls;
}
