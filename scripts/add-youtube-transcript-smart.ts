/**
 * Add YouTube Transcript (Smart) - Enhanced version with auto-fetch and AI summarization
 */
import { promises as fs } from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { TranscriptService } from "./transcript-service.js";
import { AISummarizer } from "./ai-summarizer.js";

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

interface CliOptions {
  url: string;
  title?: string;
  category: string;
  tags: string[];
  summary?: string;
  notes?: string;
  createdAt?: string;
  useAI?: boolean;
  aiSummaryLength?: "brief" | "medium" | "detailed";
  skipTranscript?: boolean;
  dryRun?: boolean;
  build?: boolean;
  languages?: string[];
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const result: Record<string, string | boolean | string[] | undefined> = {
    useAI: true,
    aiSummaryLength: "medium",
    skipTranscript: false,
    dryRun: false,
    build: true,
    languages: ["en"]
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith("--")) continue;

    if (arg === "--no-ai") {
      result.useAI = false;
      continue;
    }
    if (arg === "--no-build") {
      result.build = false;
      continue;
    }
    if (arg === "--dry-run") {
      result.dryRun = true;
      continue;
    }
    if (arg === "--skip-transcript") {
      result.skipTranscript = true;
      continue;
    }

    const key = arg.slice(2);
    const value = args[i + 1];
    if (value && !value.startsWith("--")) {
      if (key === "tags") {
        result[key] = value.split(",").map((t) => t.trim()).filter(Boolean);
      } else if (key === "languages") {
        result[key] = value.split(",").map((l) => l.trim()).filter(Boolean);
      } else {
        result[key] = value;
      }
      i += 1;
    } else {
      result[key] = "true";
    }
  }

  if (typeof result.url !== "string") {
    throw new Error("Missing required --url");
  }
  if (typeof result.category !== "string") {
    throw new Error("Missing required --category");
  }

  const category = result.category;
  if (!VALID_CATEGORIES.has(category)) {
    throw new Error(
      `Unknown category '${category}'. Valid categories: ${[...VALID_CATEGORIES].join(", ")}`
    );
  }

  return {
    url: result.url,
    title: typeof result.title === "string" ? result.title : undefined,
    category,
    tags: Array.isArray(result.tags) ? result.tags.map((t) => t.toLowerCase()) : [],
    summary: typeof result.summary === "string" ? result.summary : undefined,
    notes: typeof result.notes === "string" ? result.notes : undefined,
    createdAt: typeof result.createdAt === "string" ? result.createdAt : undefined,
    useAI: result.useAI === true,
    aiSummaryLength: (result.aiSummaryLength as "brief" | "medium" | "detailed") || "medium",
    skipTranscript: result.skipTranscript === true,
    dryRun: result.dryRun === true,
    build: result.build !== false,
    languages: Array.isArray(result.languages) ? result.languages : ["en"]
  };
}

function extractVideoId(url: string): string {
  const match = url.match(/[?&]v=([^&#]+)/) || url.match(/youtu\.be\/([^?&#]+)/);
  if (!match) {
    throw new Error(`Unable to parse video id from url: ${url}`);
  }
  return match[1];
}

async function fetchVideoTitle(videoId: string): Promise<string | undefined> {
  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15"
      }
    });
    const html = await response.text();
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    if (titleMatch) {
      return titleMatch[1].replace(" - YouTube", "").trim();
    }
  } catch {
    // Ignore errors
  }
  return undefined;
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
  notes?: string;
  hasTranscript?: boolean;
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
  notes?: string;
  transcript: string;
  aiSummary?: string;
  keyPoints?: string[];
  technicalConcepts?: string[];
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

  if (params.aiSummary) {
    lines.push("");
    lines.push("## AI-Generated Summary");
    lines.push(params.aiSummary.trim());
  }

  if (params.keyPoints && params.keyPoints.length > 0) {
    lines.push("");
    lines.push("## Key Points");
    for (const point of params.keyPoints) {
      lines.push(`- ${point}`);
    }
  }

  if (params.technicalConcepts && params.technicalConcepts.length > 0) {
    lines.push("");
    lines.push("## Technical Concepts");
    for (const concept of params.technicalConcepts) {
      lines.push(`- ${concept}`);
    }
  }

  if (params.notes) {
    lines.push("");
    lines.push("## Notes");
    lines.push(params.notes.trim());
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
  const options = parseArgs();
  const videoId = extractVideoId(options.url);

  console.log(`📺 Processing YouTube video: ${videoId}`);
  console.log(`   URL: ${options.url}`);
  console.log(`   Category: ${options.category}`);

  let title = options.title;
  if (!title) {
    console.log("   Fetching video title...");
    title = await fetchVideoTitle(videoId);
    if (title) {
      console.log(`   Title: ${title}`);
    } else {
      title = `YouTube Video ${videoId}`;
      console.log(`   Warning: Could not fetch title, using placeholder`);
    }
  }

  let transcript = "";
  let hasTranscript = false;
  let transcriptError: string | undefined;

  if (!options.skipTranscript && !options.dryRun) {
    console.log("\n📜 Fetching transcript...");
    const service = new TranscriptService({
      defaultLanguages: options.languages,
      cacheEnabled: true
    });
    await service.initialize();

    const result = await service.fetchTranscript(videoId);

    if ("error" in result) {
      transcriptError = result.error;
      console.log(`   ⚠️  Transcript unavailable: ${result.errorType}`);
      console.log(`   Error: ${result.error}`);
    } else {
      transcript = result.transcript;
      hasTranscript = true;
      console.log(`   ✓ Transcript fetched (${result.transcript.length} chars)`);
      if (result.cached) {
        console.log("   (from cache)");
      }
    }
  }

  let aiSummary: string | undefined;
  let keyPoints: string[] | undefined;
  let technicalConcepts: string[] | undefined;

  if (options.useAI && hasTranscript && !options.dryRun) {
    console.log("\n🤖 Generating AI summary...");
    try {
      const summarizer = new AISummarizer({
        defaultSummaryLength: options.aiSummaryLength
      });
      await summarizer.initialize();

      const result = await summarizer.summarize(videoId, transcript, {
        length: options.aiSummaryLength,
        title,
        category: options.category
      });

      if ("error" in result) {
        console.log(`   ⚠️  AI summary failed: ${result.error}`);
      } else {
        aiSummary = result.summary;
        keyPoints = result.keyPoints;
        technicalConcepts = result.technicalConcepts;
        console.log(`   ✓ AI summary generated (${result.tokensUsed} tokens)`);
        if (result.cached) {
          console.log("   (from cache)");
        }
      }
    } catch (error) {
      console.log(`   ⚠️  AI summary error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const transcriptBody = hasTranscript
    ? transcript
    : transcriptError
      ? `Transcript not available: ${transcriptError}`
      : "Transcript not available yet.";

  const tags = [...options.tags];
  if (!hasTranscript) {
    tags.push("needs-transcript");
  }

  if (options.dryRun) {
    console.log("\n🔍 DRY RUN - Would create:");
    console.log(`   Video ID: ${videoId}`);
    console.log(`   Title: ${title}`);
    console.log(`   Has Transcript: ${hasTranscript}`);
    console.log(`   Has AI Summary: ${!!aiSummary}`);
    console.log(`   Tags: ${tags.join(", ")}`);
    return;
  }

  console.log("\n💾 Saving files...");

  const transcriptPath = path.join(TRANSCRIPTS_DIR, `${videoId}.md`);
  const relativeTranscript = path.relative(ROOT, transcriptPath);

  await fs.mkdir(TRANSCRIPTS_DIR, { recursive: true });

  const transcriptMarkdown = buildTranscriptMarkdown({
    url: options.url,
    title,
    summary: options.summary,
    notes: options.notes,
    transcript: transcriptBody,
    aiSummary,
    keyPoints,
    technicalConcepts
  });

  await fs.writeFile(transcriptPath, transcriptMarkdown, "utf-8");
  console.log(`   ✓ Created ${relativeTranscript}`);

  const description = options.summary || aiSummary || title;
  const createdAt = toIsoDate(options.createdAt);

  await upsertCorpusEntry({
    id: `yt-${videoId}`,
    category: options.category,
    title,
    description,
    summary: options.summary || aiSummary,
    notes: options.notes,
    hasTranscript,
    urls: {
      video: options.url,
      transcript: `transcripts/${videoId}.md`
    },
    tags,
    createdAt
  });
  console.log(`   ✓ Updated corpus.json`);

  if (options.build) {
    console.log("\n🔨 Rebuilding Markdown...");
    const buildResult = spawnSync("npx", ["tsx", "scripts/build-md.ts"], {
      stdio: "inherit"
    });
    if (buildResult.status !== 0) {
      console.warn("   ⚠️  Failed to rebuild markdown");
    }
  }

  console.log("\n✅ Complete!");
  console.log(`   Video: ${options.url}`);
  console.log(`   Transcript: ${relativeTranscript}`);
  console.log(`   Corpus: corpus.json`);
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
