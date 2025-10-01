import { promises as fs } from "fs";
import path from "path";

const ROOT = process.cwd();
const CORPUS_JSON_PATH = path.join(ROOT, "corpus", "corpus.json");
const DEFAULT_EXPORT_PATH = path.join(ROOT, "data", "XBookmarksExporter.json");

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
  input: string;
  defaultCategory: string;
  defaultTags: string[];
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

  const input = typeof result.input === "string" ? result.input : DEFAULT_EXPORT_PATH;
  const defaultCategory = typeof result.defaultCategory === "string" ? result.defaultCategory : "graphics";
  const defaultTags = (typeof result.defaultTags === "string" ? result.defaultTags : "")
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);

  return {
    input,
    defaultCategory,
    defaultTags,
    build: result.build === true
  };
}

type RawBookmark = Record<string, any>;

type NormalizedTweet = {
  id: string;
  text: string;
  createdAt?: string;
  tweetUrl?: string;
  externalUrls: string[];
};

function unwrapArrayCandidate(data: any): RawBookmark[] {
  if (Array.isArray(data)) return data as RawBookmark[];
  if (Array.isArray(data?.bookmarks)) return data.bookmarks;
  if (Array.isArray(data?.tweets)) return data.tweets;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  throw new Error("Unsupported export format: could not find array root");
}

function extractTweetId(item: RawBookmark): string | undefined {
  return (
    item.tweetId ||
    item.tweet_id ||
    item.id_str ||
    item.id ||
    item?.tweet?.id_str ||
    item?.tweet?.id
  );
}

function extractCreatedAt(item: RawBookmark): string | undefined {
  return (
    item.createdAt ||
    item.created_at ||
    item?.tweet?.created_at ||
    item.bookmarked_at
  );
}

function extractTweetUrl(item: RawBookmark): string | undefined {
  return (
    item.tweetUrl ||
    item.url ||
    item.permalink ||
    item?.tweet?.url ||
    (item.screen_name && item.tweetId
      ? `https://twitter.com/${item.screen_name}/status/${item.tweetId}`
      : undefined)
  );
}

function extractText(item: RawBookmark): string {
  const text =
    item.fullText ||
    item.full_text ||
    item.text ||
    item.body ||
    item?.tweet?.full_text ||
    item?.tweet?.text ||
    "";
  return String(text).replace(/\s+/g, " ").trim();
}

function extractExternalUrls(item: RawBookmark): string[] {
  const urls: string[] = [];
  const entities = item.entities || item?.tweet?.entities;
  if (entities?.urls) {
    for (const url of entities.urls) {
      if (url?.expanded_url) urls.push(url.expanded_url);
      else if (url?.url) urls.push(url.url);
    }
  }
  if (Array.isArray(item.external_links)) {
    for (const link of item.external_links) {
      if (typeof link === "string") urls.push(link);
      else if (link?.url) urls.push(link.url);
    }
  }
  if (item.url && /^https?:/.test(item.url)) urls.push(item.url);
  const deduped = Array.from(new Set(urls.map((url) => url.split("?", 1)[0])));
  return deduped.filter((url) => !url.includes("twitter.com"));
}

function normalize(item: RawBookmark): NormalizedTweet | null {
  const id = extractTweetId(item);
  if (!id) return null;
  const text = extractText(item);
  if (!text) return null;
  return {
    id: String(id),
    text,
    createdAt: extractCreatedAt(item),
    tweetUrl: extractTweetUrl(item),
    externalUrls: extractExternalUrls(item)
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
  tweet: NormalizedTweet,
  defaultCategory: string,
  defaultTags: string[]
): { category: string; tags: string[] } {
  const haystack = [tweet.text, tweet.externalUrls.join(" ")].join(" \n ");
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(haystack)) {
      return {
        category: rule.category,
        tags: Array.from(new Set([...rule.tags, ...defaultTags]))
      };
    }
  }
  const fallbackCategory = VALID_CATEGORIES.has(defaultCategory)
    ? defaultCategory
    : "graphics";
  return {
    category: fallbackCategory,
    tags: [...new Set(defaultTags)]
  };
}

function truncate(text: string, length = 140): string {
  if (text.length <= length) return text;
  return `${text.slice(0, length - 1).trim()}…`;
}

function buildUrls(tweet: NormalizedTweet) {
  const urls: Record<string, string> = {};
  if (tweet.tweetUrl) urls.tweet = tweet.tweetUrl;
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

async function upsertCorpus(entries: Array<{
  id: string;
  category: string;
  title: string;
  description: string;
  urls: Record<string, string>;
  tags: string[];
  createdAt: string;
}>) {
  if (!entries.length) return;
  const raw = await fs.readFile(CORPUS_JSON_PATH, "utf-8");
  const corpus = JSON.parse(raw) as Array<Record<string, any>>;
  const map = new Map<string, Record<string, any>>(
    corpus.map((entry) => [entry.id, entry])
  );

  for (const entry of entries) {
    map.set(entry.id, { ...map.get(entry.id), ...entry });
  }

  const next = Array.from(map.values());
  next.sort((a, b) => {
    const aDate = typeof a.createdAt === "string" ? new Date(a.createdAt).getTime() : 0;
    const bDate = typeof b.createdAt === "string" ? new Date(b.createdAt).getTime() : 0;
    return bDate - aDate;
  });

  await fs.writeFile(CORPUS_JSON_PATH, JSON.stringify(next, null, 2) + "\n", "utf-8");
}

function toIsoDate(value?: string): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString().slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

async function main() {
  const args = parseArgs();
  const buffer = await fs.readFile(path.resolve(args.input), "utf-8");
  const data = JSON.parse(buffer);
  const items = unwrapArrayCandidate(data);
  const normalized: NormalizedTweet[] = [];
  for (const item of items) {
    const tweet = normalize(item);
    if (tweet) normalized.push(tweet);
  }

  const additions: Array<{
    id: string;
    category: string;
    title: string;
    description: string;
    urls: Record<string, string>;
    tags: string[];
    createdAt: string;
  }> = [];

  for (const tweet of normalized) {
    const { category, tags } = inferCategoryAndTags(
      tweet,
      args.defaultCategory,
      args.defaultTags
    );
    const createdAt = toIsoDate(tweet.createdAt);
    const urls = buildUrls(tweet);
    if (!urls.tweet) {
      urls.tweet = `https://twitter.com/i/web/status/${tweet.id}`;
    }
    const description = truncate(tweet.text, 240);
    additions.push({
      id: tweet.id,
      category,
      title: truncate(tweet.text.split("https://")[0].trim() || tweet.text, 96),
      description,
      urls,
      tags,
      createdAt
    });
  }

  await upsertCorpus(additions);

  if (args.build) {
    await import("./build-md.ts");
  }

  console.log(`✅ Processed ${additions.length} bookmarks from ${path.relative(ROOT, args.input)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
