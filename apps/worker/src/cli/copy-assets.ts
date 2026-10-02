// Copies question images from the source's servers into our own storage, then points the
// questions at our copy. Safe to re-run: files already copied are not downloaded again.
//
//   npm run assets:copy [-- --dry-run]
//
// The images are public files, so no session token is involved.
import crypto from "node:crypto";
import { requireEnv } from "@satsharks/config";
import { AssetModel, connectMongo, disconnectMongo, QuestionModel } from "@satsharks/db";

const ALLOWED_TYPES: Record<string, string> = {
  "image/svg+xml": "svg",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const MAX_BYTES = 2 * 1024 * 1024;
const DELAY_MS = 300;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  await connectMongo(requireEnv("MONGODB_URI"));
  await AssetModel.init();

  // Every asset still pointing at an external URL.
  const rows = await QuestionModel.aggregate<{ _id: string; questions: number }>([
    { $unwind: "$assets" },
    { $match: { "assets.url": /^https?:\/\// } },
    { $group: { _id: "$assets.url", questions: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  console.log(`${rows.length} external image(s) referenced by ${rows.reduce((sum, row) => sum + row.questions, 0)} question asset(s).`);
  if (dryRun || rows.length === 0) return;

  let downloaded = 0;
  let reused = 0;
  let bytes = 0;
  let questionsUpdated = 0;
  const failures: string[] = [];

  for (const [index, row] of rows.entries()) {
    const sourceUrl = row._id;
    try {
      const existing = await AssetModel.findOne({ sourceUrl }).select("key").lean();
      let key = existing?.key;
      if (key) {
        reused++;
      } else {
        const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(30_000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const contentType = (response.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
        const extension = ALLOWED_TYPES[contentType];
        if (!extension) throw new Error(`unexpected content type "${contentType}"`);
        const data = Buffer.from(await response.arrayBuffer());
        if (data.length === 0 || data.length > MAX_BYTES) throw new Error(`unexpected size ${data.length} bytes`);

        key = `${crypto.createHash("sha256").update(sourceUrl).digest("hex").slice(0, 32)}.${extension}`;
        await AssetModel.create({ key, sourceUrl, contentType, size: data.length, data });
        downloaded++;
        bytes += data.length;
        await sleep(DELAY_MS);
      }

      const result = await QuestionModel.updateMany(
        { "assets.url": sourceUrl },
        { $set: { "assets.$[asset].url": `/api/assets/${key}`, "assets.$[asset].sourceUrl": sourceUrl } },
        { arrayFilters: [{ "asset.url": sourceUrl }] },
      );
      questionsUpdated += result.modifiedCount;
    } catch (error) {
      failures.push(`${sourceUrl}: ${error instanceof Error ? error.message : String(error)}`);
    }
    if ((index + 1) % 25 === 0) console.log(`  ${index + 1}/${rows.length}`);
  }

  console.log(
    [
      `Downloaded: ${downloaded} (${(bytes / 1024 / 1024).toFixed(2)} MB)`,
      `Already in our storage: ${reused}`,
      `Questions now pointing at our copy: ${questionsUpdated}`,
      `Failed: ${failures.length}`,
    ].join("\n"),
  );
  if (failures.length > 0) {
    console.error(failures.map((failure) => `  - ${failure}`).join("\n"));
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => disconnectMongo());
