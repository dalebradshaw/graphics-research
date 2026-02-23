import { promises as fs } from "fs";
import path from "path";
import { spawn } from "child_process";

const ROOT = process.cwd();
const CORPUS_JSON_PATH = path.join(ROOT, "corpus", "corpus.json");
const CORPUS_TS_PATH = path.join(ROOT, "corpus", "corpus.ts");

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
  count: number;
  all: boolean;
  maxPages: number;
  build: boolean;
  cookieSource: string | null;
  fallback: boolean;
};

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: Record<string, string | boolean | undefined> = { 
    count: "20",
    all: false,
    maxPages: "3",
    build: false,
    cookieSource: undefined,
    fallback: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith("--")) continue;
    if (arg === "--all") {
      result.all = true;
      continue;
    }
    if (arg === "--build") {
      result.build = true;
      continue;
    }
    if (arg === "--fallback") {
      result.fallback = true;
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

  return {
    count: parseInt(String(result.count), 10) || 20,
    all: result.all === true,
    maxPages: parseInt(String(result.maxPages), 10) || 3,
    build: result.build === true,
    cookieSource: result.cookieSource ? String(result.cookieSource) : null,
    fallback: result.fallback === true
  };
}

type BirdBookmark = {
  id: string;
  text: string;
  createdAt: string;
  replyCount: number;
  retweetCount: number;
  likeCount: number;
  conversationId: string;
  inReplyToStatusId?: string;
  author: {
    username: string;
    name: string;
  };
  authorId: string;
  media?: Array<{
    type: "photo" | "video" | "animated_gif";
    url: string;
    width: number;
    height: number;
    previewUrl: string;
    videoUrl?: string;
    durationMs?: number;
  }>;
  quotedTweet?: BirdBookmark;
};

type NormalizedTweet = {
  id: string;
  text: string;
  createdAt?: string;
  tweetUrl: string;
  externalUrls: string[];
  author: string;
};

function extractExternalUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s]+/g;
  const matches = text.match(urlRegex) || [];
  return matches
    .map(url => url.replace(/[\)\]\.,;!?]+$/, ""))
    .filter(url => !url.includes("twitter.com") && !url.includes("x.com"));
}

function normalize(bookmark: BirdBookmark): NormalizedTweet {
  const externalUrls = extractExternalUrls(bookmark.text);
  
  // Get the tweet URL
  const tweetUrl = `https://x.com/${bookmark.author.username}/status/${bookmark.id}`;
  
  return {
    id: bookmark.id,
    text: bookmark.text,
    createdAt: bookmark.createdAt,
    tweetUrl,
    externalUrls,
    author: bookmark.author.username
  };
}

const CATEGORY_RULES: Array<{
  category: string;
  tags: string[];
  pattern: RegExp;
}> = [
  {
    category: "react-three-fiber",
    tags: ["react-three-fiber", "threejs"],
    pattern: /react[- ]three[- ]fiber|\br3f\b/i
  },
  {
    category: "threejs",
    tags: ["threejs"],
    pattern: /three\.?js|webgl/i
  },
  {
    category: "shaders",
    tags: ["shaders", "shader"],
    pattern: /shader|glsl|tsl/i
  },
  {
    category: "blender",
    tags: ["blender", "geometry-nodes"],
    pattern: /blender|geometry nodes/i
  },
  {
    category: "ai-tools",
    tags: ["ai", "ai-tools"],
    pattern: /ai|copilot|claude|gpt|llm/i
  },
  {
    category: "tooling",
    tags: ["tooling"],
    pattern: /tailwind|vscode|workflow|sdk/i
  }
];

function inferCategoryAndTags(
  tweet: NormalizedTweet
): { category: string; tags: string[] } {
  const haystack = [tweet.text, tweet.externalUrls.join(" ")].join(" \n ");
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(haystack)) {
      return {
        category: rule.category,
        tags: rule.tags
      };
    }
  }
  return {
    category: "graphics",
    tags: []
  };
}

function truncate(text: string, length = 140): string {
  if (text.length <= length) return text;
  return `${text.slice(0, length - 1).trim()}…`;
}

function buildUrls(tweet: NormalizedTweet) {
  const urls: Record<string, string> = {};
  urls.tweet = tweet.tweetUrl;
  
  for (const urlString of tweet.externalUrls) {
    if (urlString.includes("github.com")) {
      urls.code = urlString;
    } else if (urlString.includes("youtu")) {
      urls.video = urlString;
    } else if (urlString.includes("vercel.app") || urlString.includes("netlify.app")) {
      urls.live = urlString;
    } else if (urlString.includes("medium.com") || urlString.includes("dev.to") || urlString.includes("hashnode")) {
      urls.article = urlString;
    } else if (!urls.misc) {
      urls.misc = urlString;
    }
  }
  return urls;
}

function toIsoDate(value?: string): string {
  if (!value) return new Date().toISOString();
  // Parse Twitter's format: "Sun Feb 01 19:03:19 +0000 2026"
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
}

async function runBirdCommand(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const bird = spawn("bird", args, {
      stdio: ["pipe", "pipe", "pipe"]
    });
    
    let stdout = "";
    let stderr = "";
    
    bird.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    
    bird.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    
    bird.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`bird command failed: ${stderr || stdout}`));
      } else {
        resolve(stdout);
      }
    });
    
    bird.on("error", (error) => {
      reject(error);
    });
  });
}

async function fetchBookmarks(args: CliArgs): Promise<BirdBookmark[]> {
  const birdArgs = ["bookmarks", "--json"];
  
  if (args.all) {
    birdArgs.push("--all");
    birdArgs.push("--max-pages", String(args.maxPages));
  } else {
    birdArgs.push("-n", String(args.count));
  }
  
  if (args.cookieSource) {
    birdArgs.push("--cookie-source", args.cookieSource);
  }
  
  try {
    const output = await runBirdCommand(birdArgs);
    
    // Remove any warning lines before the JSON
    // Find the first occurrence of [ or { which starts the JSON
    const arrayStart = output.indexOf("[");
    const objectStart = output.indexOf("{");
    let jsonStart = -1;
    
    if (arrayStart !== -1 && objectStart !== -1) {
      // Use whichever comes first
      jsonStart = Math.min(arrayStart, objectStart);
    } else if (arrayStart !== -1) {
      jsonStart = arrayStart;
    } else if (objectStart !== -1) {
      jsonStart = objectStart;
    }
    
    if (jsonStart === -1) {
      throw new Error("No JSON output from bird command");
    }
    
    const jsonStr = output.slice(jsonStart);
    const parsed = JSON.parse(jsonStr);
    
    // Handle paginated results with nextCursor
    if (parsed.tweets && Array.isArray(parsed.tweets)) {
      return parsed.tweets;
    }
    
    return parsed;
  } catch (error) {
    if (args.fallback) {
      console.log("⚠️  Bird failed, falling back to export method...");
      return [];
    }
    throw error;
  }
}

async function loadCorpus(): Promise<Array<Record<string, any>>> {
  try {
    // Try JSON first
    const raw = await fs.readFile(CORPUS_JSON_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    // Fall back to reading the TS file (extract the array)
    try {
      const tsContent = await fs.readFile(CORPUS_TS_PATH, "utf-8");
      // Extract the array from "export const corpus: Entry[] = [...]"
      const match = tsContent.match(/export const corpus: Entry\[\] = (\[[\s\S]*\]);/);
      if (match) {
        return JSON.parse(match[1]);
      }
    } catch {
      // Ignore
    }
    return [];
  }
}

async function saveCorpus(corpus: Array<Record<string, any>>) {
  // Save to JSON
  await fs.writeFile(CORPUS_JSON_PATH, JSON.stringify(corpus, null, 2) + "\n", "utf-8");
  
  // Also generate the TypeScript file
  const tsContent = generateCorpusTs(corpus);
  await fs.writeFile(CORPUS_TS_PATH, tsContent, "utf-8");
}

function generateCorpusTs(corpus: Array<Record<string, any>>): string {
  const entriesJson = JSON.stringify(corpus, null, 2);
  
  return `export type Category =
  | "threejs"
  | "react-three-fiber"
  | "webgl"
  | "shaders"
  | "graphics"
  | "blender"
  | "design"
  | "tooling"
  | "ai-tools";

export type Urls = {
  tweet?: string;
  demo?: string;
  live?: string;
  code?: string;
  docs?: string;
  article?: string;
  pr?: string;
  misc?: string;
  video?: string;
  transcript?: string;
};

export type Entry = {
  id: string;
  category: Category;
  title: string;
  description: string;
  urls: Urls;
  tags: string[];
  createdAt?: string;
  summary?: string;
  notes?: string;
  hasTranscript?: boolean;
};

export const corpus: Entry[] = ${entriesJson};

export const byTag = (tag: string) =>
  corpus.filter((entry) =>
    entry.tags.map((t) => t.toLowerCase()).includes(tag.toLowerCase())
  );

export const byCategory = (category: Category) =>
  corpus.filter((entry) => entry.category === category);
`;
}

async function main() {
  const args = parseArgs();
  
  console.log("🔍 Fetching bookmarks from X...");
  
  const bookmarks = await fetchBookmarks(args);
  
  if (bookmarks.length === 0 && args.fallback) {
    console.log("No bookmarks fetched via bird. Run the fallback script manually if needed.");
    return;
  }
  
  console.log(`📥 Fetched ${bookmarks.length} bookmarks`);
  
  const corpus = await loadCorpus();
  const existingIds = new Set(corpus.map(e => e.id));
  
  const newEntries: Array<Record<string, any>> = [];
  let skipped = 0;
  
  for (const bookmark of bookmarks) {
    if (existingIds.has(bookmark.id)) {
      skipped++;
      continue;
    }
    
    const tweet = normalize(bookmark);
    const { category, tags } = inferCategoryAndTags(tweet);
    const createdAt = toIsoDate(tweet.createdAt);
    const urls = buildUrls(tweet);
    
    // Clean up the title (remove URLs and truncate)
    const titleText = tweet.text.replace(/https?:\/\/[^\s]+/g, "").trim();
    const title = truncate(titleText.split("\n")[0] || titleText, 96);
    
    const entry = {
      id: tweet.id,
      category,
      title: title || "Untitled",
      description: truncate(tweet.text, 240),
      urls,
      tags,
      createdAt
    };
    
    newEntries.push(entry);
    existingIds.add(tweet.id);
  }
  
  if (newEntries.length > 0) {
    // Add new entries
    corpus.push(...newEntries);
    
    // Sort by date (newest first)
    corpus.sort((a, b) => {
      const aDate = typeof a.createdAt === "string" ? new Date(a.createdAt).getTime() : 0;
      const bDate = typeof b.createdAt === "string" ? new Date(b.createdAt).getTime() : 0;
      return bDate - aDate;
    });
    
    await saveCorpus(corpus);
    console.log(`✅ Added ${newEntries.length} new entries to corpus`);
  }
  
  if (skipped > 0) {
    console.log(`⏭️  Skipped ${skipped} existing entries`);
  }
  
  if (args.build) {
    console.log("🏗️  Building markdown...");
    await import("./build-md.js");
  }
  
  console.log("✨ Done!");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
