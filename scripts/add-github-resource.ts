import { promises as fs } from "fs";
import path from "path";

const ROOT = process.cwd();
const CORPUS_JSON_PATH = path.join(ROOT, "corpus", "corpus.json");
const NOTES_DIR = path.join(ROOT, "notes");

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
  readmeFile?: string;
  createdAt?: string;
  docs?: string;
  demo?: string;
  live?: string;
  article?: string;
  pr?: string;
  misc?: string;
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

  const tags = (typeof result.tags === "string" ? result.tags : "")
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);

  return {
    url: result.url,
    title: result.title,
    category: result.category,
    tags,
    summary: typeof result.summary === "string" ? result.summary : undefined,
    summaryFile:
      typeof result.summaryFile === "string" ? result.summaryFile : undefined,
    readmeFile:
      typeof result.readmeFile === "string" ? result.readmeFile : undefined,
    createdAt:
      typeof result.createdAt === "string" ? result.createdAt : undefined,
    docs: typeof result.docs === "string" ? result.docs : undefined,
    demo: typeof result.demo === "string" ? result.demo : undefined,
    live: typeof result.live === "string" ? result.live : undefined,
    article: typeof result.article === "string" ? result.article : undefined,
    pr: typeof result.pr === "string" ? result.pr : undefined,
    misc: typeof result.misc === "string" ? result.misc : undefined,
    build: result.build === true
  };
}

function ensureCategory(category: string): string {
  if (!VALID_CATEGORIES.has(category)) {
    throw new Error(
      `Unknown category '${category}'. Valid options: ${[...VALID_CATEGORIES].join(", ")}`
    );
  }
  return category;
}

async function readFromStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    process.stdin.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    process.stdin.on("error", reject);
  });
}

async function readSummary(args: CliArgs): Promise<string | undefined> {
  if (args.summaryFile) {
    return (await fs.readFile(path.resolve(args.summaryFile), "utf-8")).trim() || undefined;
  }
  if (args.summary) return args.summary;
  return undefined;
}

async function readReadme(args: CliArgs): Promise<string | undefined> {
  if (args.readmeFile) {
    return (await fs.readFile(path.resolve(args.readmeFile), "utf-8")).trim() || undefined;
  }
  if (!process.stdin.isTTY) {
    const stdinText = (await readFromStdin()).trim();
    if (stdinText) return stdinText;
  }
  return undefined;
}

function deriveId(urlString: string): { id: string; urls: Record<string, string> } {
  const url = new URL(urlString);
  const cleanedHost = url.host.replace(/\./g, "-");
  const pathSegments = url.pathname.split("/").filter(Boolean);

  if (url.host.includes("github.com") && pathSegments.length >= 2) {
    const [owner, repo] = pathSegments;
    const id = `gh-${url.host.replace(/\./g, "-")}-${owner}-${repo}`;
    return {
      id,
      urls: {
        code: `https://github.com/${owner}/${repo}`
      }
    };
  }

  const slug = pathSegments.join("-") || "root";
  const id = `link-${cleanedHost}-${slug}`;
  return {
    id,
    urls: {
      misc: urlString
    }
  };
}

function toIsoDate(value?: string): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString().slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

const KEYWORD_RULES: Array<{ pattern: RegExp; tags: string[] }> = [
  { pattern: /three\.?js/i, tags: ["threejs"] },
  { pattern: /react[- ]three[- ]fiber|\br3f\b/i, tags: ["react-three-fiber"] },
  { pattern: /webgpu/i, tags: ["webgpu"] },
  { pattern: /shader|glsl|tsl/i, tags: ["shaders"] },
  { pattern: /blender/i, tags: ["blender"] },
  { pattern: /geometry nodes/i, tags: ["geometry-nodes"] },
  { pattern: /instanc(ing|e)/i, tags: ["instancing"] },
  { pattern: /performance/i, tags: ["performance"] }
];

function inferTags(content: string): string[] {
  const detected = new Set<string>();
  for (const rule of KEYWORD_RULES) {
    if (rule.pattern.test(content)) {
      rule.tags.forEach((tag) => detected.add(tag.toLowerCase()));
    }
  }
  return [...detected];
}

async function upsertCorpusEntry(entry: {
  id: string;
  category: string;
  title: string;
  description: string;
  summary?: string;
  urls: Record<string, string>;
  tags: string[];
  createdAt: string;
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

async function updateNotes(id: string, title: string, readme?: string) {
  if (!readme) return;
  await fs.mkdir(NOTES_DIR, { recursive: true });
  const notePath = path.join(NOTES_DIR, `${id}.md`);
  const content = `# ${title}\n\n${readme.trim()}\n`;
  await fs.writeFile(notePath, content, "utf-8");
}

async function main() {
  const args = parseArgs();
  const category = ensureCategory(args.category);
  const summary = await readSummary(args);
  const readme = await readReadme(args);
  const description = summary ?? args.title;
  const createdAt = toIsoDate(args.createdAt);

  const { id, urls } = deriveId(args.url);
  const baseUrls = { ...urls };
  if (args.docs) baseUrls.docs = args.docs;
  if (args.demo) baseUrls.demo = args.demo;
  if (args.live) baseUrls.live = args.live;
  if (args.article) baseUrls.article = args.article;
  if (args.pr) baseUrls.pr = args.pr;
  if (args.misc) baseUrls.misc = args.misc;
  if (!baseUrls.misc && !baseUrls.code) {
    baseUrls.misc = args.url;
  }

  const contentForTags = [args.title, summary ?? "", readme ?? ""].join("\n").toLowerCase();
  const autoTags = inferTags(contentForTags);
  const tags = Array.from(new Set([...args.tags, ...autoTags])).filter(Boolean);

  await updateNotes(id, args.title, readme);
  await upsertCorpusEntry({
    id,
    category,
    title: args.title,
    description,
    summary,
    urls: baseUrls,
    tags,
    createdAt
  });

  if (args.build) {
    await import("./build-md.ts");
  }

  console.log(`✅ Added GitHub resource ${id}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
