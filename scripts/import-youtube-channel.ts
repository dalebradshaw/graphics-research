import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { YoutubeTranscript } from "youtube-transcript";

interface CliOptions {
  url: string;
  category: string;
  tags: string[];
  limit: number;
  lang?: string;
  build: boolean;
  dryRun: boolean;
}

interface ChannelInfo {
  id: string;
  name: string;
  url: string;
  handle?: string;
}

interface FeedVideo {
  id: string;
  url: string;
  title: string;
  published: string;
  description: string;
}

interface SummaryData {
  summary: string;
  notes?: string;
}

interface FeedResult {
  title?: string;
  videos: FeedVideo[];
}

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

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const result: Record<string, string | boolean | undefined> = {
    limit: "10",
    build: true,
    dryRun: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith("--")) continue;

    if (arg === "--no-build") {
      result.build = false;
      continue;
    }
    if (arg === "--dry-run") {
      result.dryRun = true;
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

  if (typeof result.url !== "string") {
    throw new Error("Missing required --url (channel URL or handle)");
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

  const limit = Number(result.limit ?? 10);
  if (!Number.isFinite(limit) || limit <= 0) {
    throw new Error("--limit must be a positive number");
  }

  const tags = typeof result.tags === "string"
    ? result.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
    : [];

  return {
    url: result.url,
    category,
    tags,
    limit,
    lang: typeof result.lang === "string" ? result.lang : undefined,
    build: result.build === true,
    dryRun: result.dryRun === true
  };
}

async function ensureTmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "channel-import-"));
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url} (${response.status} ${response.statusText})`);
  }
  return response.text();
}

function decodeUnicode(input: string): string {
  return input.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function cleanText(input?: string | null): string {
  if (!input) return "";
  return decodeHtmlEntities(decodeUnicode(input))
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normaliseChannelUrl(raw: string): string {
  if (raw.startsWith("http")) return raw;
  if (raw.startsWith("@")) return `https://www.youtube.com/${raw}`;
  return `https://www.youtube.com/${raw.replace(/^\/+/, "")}`;
}

function baseChannelUrl(raw: string): string {
  const url = new URL(normaliseChannelUrl(raw));
  url.search = "";
  url.hash = "";
  if (/\/videos/.test(url.pathname)) {
    url.pathname = url.pathname.replace(/\/videos.*$/, "");
  }
  if (!url.pathname || url.pathname === "") {
    url.pathname = "/";
  }
  if (!url.pathname.startsWith("/")) {
    url.pathname = `/${url.pathname}`;
  }
  return url.toString();
}

function buildAttemptUrl(base: string, suffix = ""): string {
  const baseUrl = new URL(base);
  const stripped = baseUrl.pathname.replace(/\/$/, "");
  baseUrl.pathname = `${stripped}${suffix}` || "/";
  if (!baseUrl.searchParams.has("hl")) {
    baseUrl.searchParams.set("hl", "en");
  }
  return baseUrl.toString();
}

function findChannelId(html: string): string | undefined {
  const patterns = [
    /"channelId":"(UC[^"]+)"/,
    /"externalId":"(UC[^"]+)"/,
    /"externalChannelId":"(UC[^"]+)"/,
    /"browseId":"(UC[^"]+)"/,
    /data-channel-external-id="(UC[^"]+)"/,
    /"canonicalUrl":"https:\/\/www\.youtube\.com\/channel\/(UC[^"]+)"/
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match && match[1]) {
      return match[1];
    }
  }
  return undefined;
}

function extractFirst(matchers: Array<RegExpExecArray | null | undefined>): string | undefined {
  for (const match of matchers) {
    if (match && match[1]) {
      return cleanText(match[1]);
    }
  }
  return undefined;
}

async function resolveChannelInfo(rawUrl: string): Promise<ChannelInfo> {
  const base = baseChannelUrl(rawUrl);
  const attemptSuffixes = ["", "/about", "/videos"];
  const attempted: Array<{ url: string; html: string }> = [];

  for (const suffix of attemptSuffixes) {
    try {
      const attemptUrl = buildAttemptUrl(base, suffix);
      const html = await fetchText(attemptUrl);
      attempted.push({ url: attemptUrl, html });
      const channelId = findChannelId(html);
      if (channelId) {
        const name = extractFirst([
          /"ownerChannelName":"([^"]+)"/.exec(html),
          /"title":"([^"]+)"/.exec(html),
          /<meta itemprop="name" content="([^"]+)"/i.exec(html)
        ]) || channelId;

        const handle = extractFirst([/"handle":"(@[^"]+)"/.exec(html)])
          || (/@[A-Za-z0-9_\-\.]+/.exec(base)?.[0]);

        const canonicalPatterns = [
          new RegExp('<link rel="canonical" href="https://www\\.youtube\\.com/channel/([A-Za-z0-9_-]+)"', 'i'),
          new RegExp('"canonicalUrl":"https://www\\.youtube\\.com/channel/([A-Za-z0-9_-]+)"')
        ];
        const canonicalMatch = canonicalPatterns
          .map((pattern) => pattern.exec(html))
          .find((match) => match && match[1]);
        const canonicalUrl = canonicalMatch
          ? `https://www.youtube.com/channel/${canonicalMatch[1]}`
          : `https://www.youtube.com/channel/${channelId}`;

        return {
          id: channelId,
          name,
          url: canonicalUrl,
          handle
        };
      }
    } catch (error) {
      // continue to next attempt
    }
  }

  const attemptedUrls = attempted.map((item) => item.url).join(", ");
  throw new Error(`Unable to resolve channelId from ${base} (attempted: ${attemptedUrls || base})`);
}

function matchTag(xml: string, tag: string): string | undefined {
  const regex = new RegExp(String.raw`<${tag}[^>]*>([\s\S]*?)</${tag}>`, "i");
  if (process.env.DEBUG_IMPORT) {
    console.log("Primary regex:", regex);
  }
  let match = regex.exec(xml);
  if (!match && tag.includes(":")) {
    const local = tag.split(":").pop() ?? tag;
    const fallback = new RegExp(String.raw`<[^>]*${local}[^>]*>([\s\S]*?)</[^>]*${local}>`, "i");
    match = fallback.exec(xml);
    if (process.env.DEBUG_IMPORT) {
      console.log(`Fallback regex for ${tag}:`, fallback, 'match:', match?.[1]);
    }
  }
  if (!match) {
    if (process.env.DEBUG_IMPORT) {
      console.log(`matchTag(${tag}) -> no match`);
    }
    return undefined;
  }
  const value = cleanText(match[1]);
  if (process.env.DEBUG_IMPORT) {
    console.log(`matchTag(${tag}) ->`, value);
  }
  return value;
}

function matchAttr(xml: string, tag: string, attr: string): string | undefined {
  const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]+)"[^>]*>`, "i");
  const match = regex.exec(xml);
  if (!match) return undefined;
  return decodeHtmlEntities(match[1]);
}

async function fetchChannelFeed(channelId: string, limit: number): Promise<FeedResult> {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const xml = await fetchText(feedUrl);
  if (process.env.DEBUG_IMPORT) {
    console.log("Fetched feed", feedUrl);
  }
  const entries = Array.from(xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g));
  if (process.env.DEBUG_IMPORT) {
    console.log(`Feed entries found: ${entries.length}`);
    if (entries[0]) {
      console.log("First entry snippet:", entries[0][1].slice(0, 200));
    }
  }
  const videos = entries.slice(0, limit).map((entry) => {
    const entryXml = entry[1];
    if (process.env.DEBUG_IMPORT) {
      console.log("entryXml raw:", entryXml);
    }
    const id = matchTag(entryXml, "yt:videoId");
    if (process.env.DEBUG_IMPORT) {
      console.log("Parsing entry", { id });
    }
    if (!id) {
      return undefined;
    }
    const title = matchTag(entryXml, "title") || id;
    const published = matchTag(entryXml, "published") || new Date().toISOString();
    const url = matchAttr(entryXml, "link", "href") || `https://www.youtube.com/watch?v=${id}`;
    const description = matchTag(entryXml, "media:description") || "";
    return { id, url, title, published, description } as FeedVideo;
  }).filter((video): video is FeedVideo => Boolean(video));

  const channelTitle = matchTag(xml, "title");
  return {
    title: channelTitle,
    videos
  };
}

async function fetchTranscript(videoId: string, lang?: string): Promise<string> {
  const langs = lang ? [lang, "en"] : ["en"];
  for (const candidate of langs) {
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: candidate,
        country: "US"
      });
      if (transcript?.length) {
        return transcript.map((item) => item.text).join(" ").replace(/\s+/g, " ").trim();
      }
    } catch (error) {
      // ignore and try next language
    }
  }
  return "";
}

async function writeTempFile(tmpDir: string, name: string, content: string): Promise<string | undefined> {
  if (!content.trim()) return undefined;
  const filePath = path.join(tmpDir, name);
  await fs.writeFile(filePath, content, "utf-8");
  return filePath;
}

function createSummary(description: string, fallback: string): SummaryData {
  const cleaned = description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(" ");
  const sentence = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .find((part) => part.length > 0);
  const summary = sentence || fallback;
  return {
    summary,
    notes: cleaned || (summary !== fallback ? summary : undefined)
  };
}

function extractHashtags(description: string): string[] {
  const matches = description.match(/#([A-Za-z0-9_\-]+)/g) || [];
  return Array.from(new Set(matches.map((tag) => tag.replace(/^#/, "").toLowerCase())));
}

async function main() {
  const options = parseArgs();
  const tmpDir = await ensureTmpDir();
  const channel = await resolveChannelInfo(options.url);
  if (process.env.DEBUG_IMPORT) {
    console.log("Resolved channel", channel);
  }
  const { videos, title: feedTitle } = await fetchChannelFeed(channel.id, options.limit);
  if (feedTitle && (!channel.name || /home/i.test(channel.name))) {
    channel.name = feedTitle;
  }

  if (!videos.length) {
    console.log("No videos found for channel feed");
    return;
  }

  console.log(`Found ${videos.length} videos for channel ${channel.name}`);

  const failures: string[] = [];

  for (const [index, video] of videos.entries()) {
    const createdAt = new Date(video.published).toISOString().slice(0, 10);
    const { summary, notes } = createSummary(
      video.description,
      `Auto-ingested from channel ${channel.name}.`
    );
    const hashtags = extractHashtags(video.description);

    console.log(`\n[${index + 1}/${videos.length}] ${video.title}`);
    console.log(`  URL: ${video.url}`);
    console.log(`  Published: ${video.published}`);

    let transcript = "";
    if (!options.dryRun) {
      try {
        transcript = await fetchTranscript(video.id, options.lang);
        if (!transcript) {
          console.warn("  ⚠️  No transcript available (skipping transcript file)");
        } else {
          console.log(`  Transcript length: ${transcript.length} characters`);
        }
      } catch (error) {
        console.warn(`  ⚠️  Failed to fetch transcript: ${(error as Error).message}`);
      }
    }

    if (options.dryRun) {
      continue;
    }

    const summaryFile = await writeTempFile(tmpDir, `${video.id}-summary.md`, summary);
    const transcriptFile = transcript
      ? await writeTempFile(tmpDir, `${video.id}-transcript.md`, transcript)
      : undefined;

    const args = [
      "tsx",
      "scripts/add-youtube-transcript.ts",
      "--url",
      video.url,
      "--title",
      video.title,
      "--category",
      options.category,
      "--createdAt",
      createdAt
    ];

    const combinedTags = new Set<string>([
      ...options.tags.map((tag) => tag.toLowerCase()),
      ...hashtags
    ]);
    if (combinedTags.size) {
      args.push("--tags", Array.from(combinedTags).join(","));
    }

    if (summaryFile) {
      args.push("--summaryFile", summaryFile);
    } else if (summary) {
      args.push("--summary", summary);
    }

    const notesFile = notes
      ? await writeTempFile(tmpDir, `${video.id}-notes.md`, notes)
      : undefined;

    if (notesFile) {
      args.push("--notesFile", notesFile);
    } else if (notes) {
      args.push("--notes", notes);
    }

    if (transcriptFile) {
      args.push("--transcriptFile", transcriptFile);
    }

    const result = spawnSync("npx", args, { stdio: "inherit" });
    if (result.status !== 0) {
      failures.push(video.url);
    }
  }

  if (!options.dryRun && options.build) {
    console.log("\nRebuilding Markdown...");
    const buildResult = spawnSync("npx", ["tsx", "scripts/build-md.ts"], {
      stdio: "inherit"
    });
    if (buildResult.status !== 0) {
      console.warn("⚠️  Failed to rebuild markdown");
    }
  }

  if (failures.length) {
    console.warn("\nCompleted with failures:");
    failures.forEach((url) => console.warn(` - ${url}`));
    process.exitCode = 1;
  } else {
    console.log("\n✅ Channel import completed");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
