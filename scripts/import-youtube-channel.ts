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
  if (url.pathname === "") {
    url.pathname = "/";
  }
  return url.toString();
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
  const channelPage = baseChannelUrl(rawUrl);
  const html = await fetchText(channelPage);

  const channelIdMatch = /"channelId":"(UC[^"]+)"/.exec(html)
    || /<meta itemprop="channelId" content="(UC[^"]+)"/i.exec(html);
  if (!channelIdMatch) {
    throw new Error(`Unable to resolve channelId from ${channelPage}`);
  }
  const channelId = channelIdMatch[1];

  const name = extractFirst([
    /"ownerChannelName":"([^"]+)"/.exec(html),
    /"title":"([^"]+)"/.exec(html),
    /<meta itemprop="name" content="([^"]+)"/i.exec(html)
  ]) || channelId;

  const handle = extractFirst([/"handle":"(@[^"]+)"/.exec(html)]);

  const canonicalMatch = /<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/([A-Za-z0-9_-]+)"/i.exec(html);
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

function matchTag(xml: string, tag: string): string | undefined {
  const regex = new RegExp(`<${tag}[^>]*>([\s\S]*?)<\/${tag}>`, "i");
  const match = regex.exec(xml);
  if (!match) return undefined;
  return cleanText(match[1]);
}

function matchAttr(xml: string, tag: string, attr: string): string | undefined {
  const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]+)"[^>]*>`, "i");
  const match = regex.exec(xml);
  if (!match) return undefined;
  return decodeHtmlEntities(match[1]);
}

async function fetchChannelFeed(channelId: string, limit: number): Promise<FeedVideo[]> {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const xml = await fetchText(feedUrl);
  const entries = Array.from(xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g));
  return entries.slice(0, limit).map((entry) => {
    const entryXml = entry[1];
    const id = matchTag(entryXml, "yt:videoId");
    if (!id) {
      return undefined;
    }
    const title = matchTag(entryXml, "title") || id;
    const published = matchTag(entryXml, "published") || new Date().toISOString();
    const url = matchAttr(entryXml, "link", "href") || `https://www.youtube.com/watch?v=${id}`;
    const description = matchTag(entryXml, "media:description") || "";
    return { id, url, title, published, description } as FeedVideo;
  }).filter((video): video is FeedVideo => Boolean(video));
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

function normaliseSummary(description: string, fallback: string): string {
  const firstLine = description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (firstLine) return firstLine;
  return fallback;
}

async function main() {
  const options = parseArgs();
  const tmpDir = await ensureTmpDir();
  const channel = await resolveChannelInfo(options.url);
  const videos = await fetchChannelFeed(channel.id, options.limit);

  if (!videos.length) {
    console.log("No videos found for channel feed");
    return;
  }

  console.log(`Found ${videos.length} videos for channel ${channel.name}`);

  const failures: string[] = [];

  for (const [index, video] of videos.entries()) {
    const createdAt = new Date(video.published).toISOString().slice(0, 10);
    const summary = normaliseSummary(video.description, `Auto-ingested from channel ${channel.name}.`);

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

    if (options.tags.length) {
      args.push("--tags", options.tags.join(","));
    }

    if (summaryFile) {
      args.push("--summaryFile", summaryFile);
    } else if (summary) {
      args.push("--summary", summary);
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
