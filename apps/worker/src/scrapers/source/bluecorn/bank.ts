// Collects the whole question bank of one exam source and section.
//
// Two facts about the source make this cheap:
//   - pFilter returns the IDs of the questions matching a filter, without creating anything.
//     Calling it once per domain, skill and difficulty yields every label.
//   - rpGetResult returns the full content and answer of every question in a drill, opened or not.
//     So content needs one drill per chunk of IDs: pStart -> pEnd -> rpGetResult.
//
// Every response is written to disk as soon as it arrives. Running again reuses what is there,
// so an expired token or a dropped connection costs nothing.
import fs from "node:fs";
import path from "node:path";
import { isRecord, nonEmptyString } from "@satsharks/utils";
import { SourceAuthError, type Rpc } from "./api-client";

export const SOURCE_DIFFICULTIES = ["easy", "hard"] as const;

export interface ExamSource {
  id: number;
  name: string;
  examDate: string | null;
  counts: { rw: number; math: number; total: number } | null;
}

export interface BankLabels {
  domain: string | null;
  skill: string | null;
  difficulty: string | null;
}

export interface CollectedBank {
  exam: ExamSource;
  section: "math" | "rw";
  // Raw result-question objects from the source, keyed by question ID.
  questions: Map<number, Record<string, unknown>>;
  labels: Map<number, BankLabels>;
  expectedCount: number;
  warnings: string[];
  // How many responses came from disk vs the network in this run.
  stats: { fetched: number; cached: number; drillsCreated: number };
}

export interface CollectOptions {
  rpc: Rpc;
  examId: number;
  section: "math" | "rw";
  // Directory for this exam+section. Responses are cached under <dir>/raw.
  dir: string;
  chunkSize: number;
  log: (message: string) => void;
}

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const toIds = (value: unknown): number[] =>
  Array.isArray(value) ? value.map(Number).filter((id) => Number.isInteger(id)) : [];

export async function listExamSources(rpc: Rpc): Promise<ExamSource[]> {
  const [metadata, counts] = [await rpc("getQsMetadata", {}), await rpc("getCounts", {})];
  const countById = new Map<number, ExamSource["counts"]>();
  for (const row of Array.isArray(counts) ? counts.filter(isRecord) : []) {
    countById.set(Number(row.id), { rw: Number(row.rw) || 0, math: Number(row.math) || 0, total: Number(row.total) || 0 });
  }
  const exams = isRecord(metadata) && Array.isArray(metadata.exams) ? metadata.exams.filter(isRecord) : [];
  return exams.map((exam) => ({
    id: Number(exam.id),
    name: nonEmptyString(exam.name) ?? `Exam source ${String(exam.id)}`,
    examDate: nonEmptyString(exam.exam_date),
    counts: countById.get(Number(exam.id)) ?? null,
  }));
}

export async function collectBank(options: CollectOptions): Promise<CollectedBank> {
  const { rpc, examId, section, log } = options;
  const rawDir = path.join(options.dir, "raw");
  fs.mkdirSync(rawDir, { recursive: true });
  const stats = { fetched: 0, cached: 0, drillsCreated: 0 };
  const warnings: string[] = [];

  const read = (name: string): unknown => {
    const file = path.join(rawDir, `${name}.json`);
    return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as unknown) : undefined;
  };
  const write = (name: string, value: unknown) =>
    fs.writeFileSync(path.join(rawDir, `${name}.json`), `${JSON.stringify(value, null, 2)}\n`);

  // A cached response is only reused if it answers the same request.
  const cached = async (name: string, fn: string, request: Record<string, unknown>): Promise<unknown> => {
    const saved = read(name);
    if (isRecord(saved) && saved.fn === fn && JSON.stringify(saved.request) === JSON.stringify(request)) {
      stats.cached++;
      return saved.response;
    }
    const response = await rpc(fn, request);
    stats.fetched++;
    write(name, { fn, request, response });
    return response;
  };

  // ----- catalogue -----
  const metadata = await cached("catalogue-metadata", "getQsMetadata", {});
  const counts = await cached("catalogue-counts", "getCounts", {});
  const examRow = isRecord(metadata) && Array.isArray(metadata.exams)
    ? metadata.exams.filter(isRecord).find((exam) => Number(exam.id) === examId)
    : undefined;
  if (!examRow) throw new Error(`Exam source ${examId} is not in the source's catalogue. Run with --list to see them.`);
  const countRow = Array.isArray(counts) ? counts.filter(isRecord).find((row) => Number(row.id) === examId) : undefined;
  const exam: ExamSource = {
    id: examId,
    name: nonEmptyString(examRow.name) ?? `Exam source ${examId}`,
    examDate: nonEmptyString(examRow.exam_date),
    counts: countRow ? { rw: Number(countRow.rw) || 0, math: Number(countRow.math) || 0, total: Number(countRow.total) || 0 } : null,
  };
  const vocabulary = (key: string): string[] =>
    isRecord(metadata) && Array.isArray(metadata[key]) ? (metadata[key] as unknown[]).map(String) : [];
  const domains = vocabulary(`${section}_domains`);
  const skills = vocabulary(`${section}_skills`);

  // ----- IDs and labels -----
  const filter = (extra: Record<string, unknown>) => ({
    p_exam_id: examId,
    p_section: section,
    p_domains: null,
    p_skills: null,
    p_difficulty: null,
    p_exclude_ids: null,
    p_limit: null,
    ...extra,
  });

  const allIds = [...new Set(toIds(await cached("filter-all", "pFilter", filter({}))))].sort((a, b) => a - b);
  log(`${exam.name} / ${section}: ${allIds.length} questions`);
  if (exam.counts && exam.counts[section] !== allIds.length) {
    warnings.push(`Catalogue reports ${exam.counts[section]} ${section} questions; the unfiltered query returned ${allIds.length}`);
  }

  const labels = new Map<number, BankLabels>(allIds.map((id) => [id, { domain: null, skill: null, difficulty: null }]));
  const conflicts = { domain: new Set<number>(), skill: new Set<number>(), difficulty: new Set<number>() };
  const assign = (kind: keyof BankLabels, value: string, ids: number[]) => {
    for (const id of ids) {
      const entry = labels.get(id);
      if (!entry) continue;
      // A question matching two values of the same label is ambiguous: leave it unlabelled.
      if (entry[kind] !== null && entry[kind] !== value) conflicts[kind].add(id);
      entry[kind] = value;
    }
  };

  if (allIds.length > 0) {
    for (const domain of domains) {
      assign("domain", domain, toIds(await cached(`filter-domain-${slug(domain)}`, "pFilter", filter({ p_domains: [domain] }))));
    }
    for (const skill of skills) {
      assign("skill", skill, toIds(await cached(`filter-skill-${slug(skill)}`, "pFilter", filter({ p_skills: [skill] }))));
    }
    for (const difficulty of SOURCE_DIFFICULTIES) {
      assign("difficulty", difficulty, toIds(await cached(`filter-difficulty-${difficulty}`, "pFilter", filter({ p_difficulty: difficulty }))));
    }
  }
  for (const kind of ["domain", "skill", "difficulty"] as const) {
    for (const id of conflicts[kind]) labels.get(id)![kind] = null;
    if (conflicts[kind].size > 0) warnings.push(`${conflicts[kind].size} question(s) matched more than one ${kind}; left unlabelled`);
  }

  // ----- content: one drill per chunk -----
  const questions = new Map<number, Record<string, unknown>>();
  const chunks: number[][] = [];
  for (let i = 0; i < allIds.length; i += options.chunkSize) chunks.push(allIds.slice(i, i + options.chunkSize));

  for (const [index, ids] of chunks.entries()) {
    const name = `chunk-${String(index + 1).padStart(3, "0")}`;
    let saved = read(name);
    const usable = isRecord(saved) && JSON.stringify(saved.ids) === JSON.stringify(ids);
    if (!usable) saved = undefined;

    let result = isRecord(saved) ? saved.result : undefined;
    if (result === undefined) {
      // The attempt ID is saved before anything else, so an interrupted chunk resumes the same
      // drill instead of creating another one.
      let attemptId = isRecord(saved) ? nonEmptyString(saved.attemptId) : null;
      if (!attemptId) {
        const started = await rpc("pStart", {
          p_exam_id: examId,
          p_question_ids: ids,
          p_timer: false,
          p_t_time: null,
          p_name: `import ${examId} ${section} ${index + 1}/${chunks.length}`,
        });
        attemptId = nonEmptyString(started);
        if (!attemptId) throw new Error(`pStart did not return an attempt ID for ${name}`);
        stats.drillsCreated++;
        write(name, { ids, attemptId });
      }
      try {
        await rpc("pEnd", { p_attempt_id: attemptId });
      } catch (error) {
        // Already ended in an earlier, interrupted run. The result call below is the real test.
        if (error instanceof SourceAuthError) throw error;
      }
      result = await rpc("rpGetResult", { p_attempt_id: attemptId });
      stats.fetched++;
      write(name, { ids, attemptId, result });
      log(`  ${name}: ${ids.length} questions fetched (${index + 1}/${chunks.length})`);
    } else {
      stats.cached++;
    }

    const returned = isRecord(result) && Array.isArray(result.questions) ? result.questions.filter(isRecord) : [];
    for (const question of returned) {
      const id = Number(question.question_id ?? question.content_id);
      if (Number.isInteger(id)) questions.set(id, question);
    }
    if (returned.length !== ids.length) warnings.push(`${name}: asked for ${ids.length} questions, the result returned ${returned.length}`);
  }

  const missing = allIds.filter((id) => !questions.has(id));
  if (missing.length > 0) warnings.push(`${missing.length} question(s) listed by the source were not returned: ${missing.slice(0, 10).join(", ")}${missing.length > 10 ? ", …" : ""}`);

  return { exam, section, questions, labels, expectedCount: allIds.length, warnings, stats };
}
