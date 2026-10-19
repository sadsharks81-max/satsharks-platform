// Load test (proposal 4.4: "many students taking papers at the same time").
//
// Simulates students using the site at once: public pages' API calls, and, with a test account,
// signing in once and loading the practice catalog, dashboard data and analytics again and again.
// Read-only: it never starts tests, answers questions or writes anything (sign-in apart).
//
//   node apps/api/test/load/load-test.mjs --url https://staging.example.com --users 100 --seconds 60
//   node apps/api/test/load/load-test.mjs --url http://localhost:4100 --users 50 --seconds 30 \
//     --email phase1-test-load@example.com --password ...
//
// Run it against a staging copy or the e2e server (npx tsx apps/api/test/e2e/test-uploads.e2e.ts
// <pdfs> --serve 4100), never against production at busy hours, and with a temporary
// phase1-test-* account. The API's per-address limit (300 requests a minute) applies to one
// machine: start the API with a higher limit or run from several machines for big numbers.

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, value, index, all) => (value.startsWith("--") ? [...pairs, [value.slice(2), all[index + 1]]] : pairs), []),
);
const base = (args.url ?? "http://localhost:4000").replace(/\/$/, "");
const users = Number(args.users ?? 20);
const seconds = Number(args.seconds ?? 30);

const publicPaths = ["/api/health", "/api/pricing", "/api/sat-dates", "/api/public/proof", "/api/public/offers"];
const studentPaths = ["/api/auth/me", "/api/practice/catalog", "/api/practice/attempts", "/api/student/engagement", "/api/student/analytics", "/api/billing"];

async function signIn() {
  if (!args.email || !args.password) return null;
  const response = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: args.email, password: args.password }) });
  if (!response.ok) throw new Error(`Sign-in failed: ${response.status} ${await response.text()}`);
  return response.headers.get("set-cookie")?.split(";")[0] ?? null;
}

const timings = [];
const failures = new Map();
let requests = 0;

async function hit(path, cookie) {
  const started = performance.now();
  try {
    const response = await fetch(base + path, { headers: cookie ? { cookie } : {} });
    await response.arrayBuffer();
    timings.push(performance.now() - started);
    if (!response.ok) failures.set(`${response.status} ${path}`, (failures.get(`${response.status} ${path}`) ?? 0) + 1);
  } catch (error) {
    failures.set(`network ${path}`, (failures.get(`network ${path}`) ?? 0) + 1);
  }
  requests += 1;
}

async function student(cookie, until) {
  const paths = cookie ? [...publicPaths, ...studentPaths] : publicPaths;
  while (Date.now() < until) {
    await hit(paths[Math.floor(Math.random() * paths.length)], cookie);
    // A real student pauses between screens.
    await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 800));
  }
}

const percentile = (sorted, p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] : 0);

const cookie = await signIn();
console.log(`Load test: ${users} simulated students for ${seconds}s against ${base}${cookie ? " (signed in)" : " (public endpoints only)"}`);
const until = Date.now() + seconds * 1000;
await Promise.all(Array.from({ length: users }, () => student(cookie, until)));

const sorted = [...timings].sort((a, b) => a - b);
console.log(`\n${requests} requests, ${(requests / seconds).toFixed(1)} per second`);
console.log(`Response time: median ${percentile(sorted, 50).toFixed(0)} ms · p95 ${percentile(sorted, 95).toFixed(0)} ms · p99 ${percentile(sorted, 99).toFixed(0)} ms · slowest ${(sorted.at(-1) ?? 0).toFixed(0)} ms`);
if (failures.size === 0) console.log("No failed requests.");
else {
  console.log("Failed requests:");
  for (const [key, count] of failures) console.log(`  ${count} × ${key}`);
  process.exitCode = 1;
}
