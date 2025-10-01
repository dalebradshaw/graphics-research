import { promises as fs } from "fs";
import path from "path";

const ROOT = process.cwd();
const CORPUS_JSON_PATH = path.join(ROOT, "corpus", "corpus.json");
const TRANSCRIPTS_DIR = path.join(ROOT, "transcripts");

const VALID_CATEGORIES = new Set([
  "threejs",
  "react-three-fiber",
  "webgl",
  "shaders",
  "graphics",
  "blender",
  "design",
  "tooling",
  "ai-tools"
]);

type CliArgs = {
  url: string;
  title: string;
  category: string;
  tags: string[];
  summary?: string;
  summaryFile?: string;
  transcriptFile?: string;
  createdAt?: string;
  id?: string;
  build: boolean;
};

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: Record<string, string | boolean | undefined> = { build: false };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith("--")) continue;
    if (arg === "--build") {
      result.build = true;
      continue;
    }
    const key = arg.slice(2);
    const value = args[i + 1];
    if (value && !value.startsWith("--")) {
      result[key] = value;
      i += 1;
    } else {
      result[key] = "true";
    }
  }

  if (typeof result.url !== "string") throw new Error("Missing --url");
  if (typeof result.title !== "string") throw new Error("Missing --title");
  if (typeof result.category !== "string") throw new Error("Missing --category");

  const tagsRaw = typeof result.tags === "string" ? result.tags : "";
  const tags = tagsRaw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => tag.toLowerCase());

  return {
    url: result.url,
    title: result.title,
    category: result.category,
    tags,
    summary: typeof result.summary === "string" ? result.summary : undefined,
    summaryFile:
      typeof result.summaryFile === "string" ? result.summaryFile : undefined,
    transcriptFile:
      typeof result.transcriptFile === "string"
        ? result.transcriptFile
        : undefined,
    createdAt:
      typeof result.createdAt === "string" ? result.createdAt : undefined,
    id: typeof result.id === "string" ? result.id : undefined,
    build: result.build === true
  };
}

function extractVideoId(url: string): string {
  const match = url.match(/[?&]v=([^&#]+)/) || url.match(/youtu\.be\/([^?&#]+)/);
  if (!match) {
    throw new Error(`Unable to parse video id from url: ${url}`);
  }
  return match[1];
}

async function readFromStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    process.stdin.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    process.stdin.on("error", reject);
  });
}

async function readTranscriptText(args: CliArgs): Promise<string> {
  if (args.transcriptFile) {
    return fs.readFile(path.resolve(args.transcriptFile), "utf-8");
  }
  if (!process.stdin.isTTY) {
    const stdinContent = await readFromStdin();
    if (stdinContent.trim()) return stdinContent;
  }
  return "";
}

async function readSummary(args: CliArgs): Promise<string | undefined> {
  if (args.summaryFile) {
    const fileSummary = await fs.readFile(path.resolve(args.summaryFile), "utf-8");
    return fileSummary.trim() || undefined;
  }
  if (args.summary) return args.summary;
  return undefined;
}

function ensureCategory(category: string): string {
  if (!VALID_CATEGORIES.has(category)) {
    throw new Error(
      `Unknown category '${category}'. Valid options: ${[...VALID_CATEGORIES].join(", ")}`
    );
  }
  return category;
}

function toIsoDate(value?: string): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString().slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

async function upsertCorpusEntry(entry: {
  id: string;
  category: string;
  title: string;
  description: string;
  urls: Record<string, string>;
  tags: string[];
  createdAt: string;
  summary?: string;
}) {
  const raw = await fs.readFile(CORPUS_JSON_PATH, "utf-8");
  const corpus = JSON.parse(raw) as Array<Record<string, unknown>>;
  const existingIndex = corpus.findIndex((item) => item.id === entry.id);
  if (existingIndex >= 0) {
    corpus[existingIndex] = { ...corpus[existingIndex], ...entry };
  } else {
    corpus.push(entry);
  }

  corpus.sort((a, b) => {
    const aDate = typeof a.createdAt === "string" ? new Date(a.createdAt).getTime() : 0;
    const bDate = typeof b.createdAt === "string" ? new Date(b.createdAt).getTime() : 0;
    return bDate - aDate;
  });

  await fs.writeFile(CORPUS_JSON_PATH, JSON.stringify(corpus, null, 2) + "\n", "utf-8");
}

function buildTranscriptMarkdown(params: {
  url: string;
  title: string;
  summary?: string;
  transcript: string;
}): string {
  const lines: string[] = [];
  lines.push(`# ${params.title}`);
  lines.push("");
  lines.push(`**Video:** ${params.url}`);
  if (params.summary) {
    lines.push("");
    lines.push("## Summary");
    lines.push(params.summary.trim());
  }
  if (params.transcript.trim()) {
    lines.push("");
    lines.push("## Transcript");
    lines.push(params.transcript.trim());
  }
  lines.push("");
  return lines.join("\n");
}

async function main() {
  const args = parseArgs();
  const category = ensureCategory(args.category);
  const videoId = args.id ?? extractVideoId(args.url);
  const transcriptText = (await readTranscriptText(args)).trim();
  const summary = await readSummary(args);

  const transcriptPath = path.join(TRANSCRIPTS_DIR, `${videoId}.md`);
  const relativeTranscript = path.relative(ROOT, transcriptPath);

  await fs.mkdir(TRANSCRIPTS_DIR, { recursive: true });
  const transcriptMarkdown = buildTranscriptMarkdown({
    url: args.url,
    title: args.title,
    summary,
    transcript: transcriptText
  });
  await fs.writeFile(transcriptPath, transcriptMarkdown, "utf-8");

  const description = summary ?? args.title;
  const createdAt = toIsoDate(args.createdAt);
  await upsertCorpusEntry({
    id: `yt-${videoId}`,
    category,
    title: args.title,
    description,
    summary,
    urls: {
      video: args.url,
      transcript: `transcripts/${videoId}.md`
    },
    tags: args.tags,
    createdAt
  });

  if (args.build) {
    await import("./build-md.ts");
  }

  console.log(`✅ Added YouTube transcript ${relativeTranscript}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
