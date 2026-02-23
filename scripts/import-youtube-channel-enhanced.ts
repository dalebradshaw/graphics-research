/**
 * Import YouTube Channel (Enhanced) - Enhanced channel import with AI summarization
 */
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { TranscriptService } from "./transcript-service.js";
import { AISummarizer } from "./ai-summarizer.js";

interface CliOptions {
  url: string;
  category: string;
  tags: string[];
  limit: number;
  lang?: string;
  build: boolean;
  dryRun: boolean;
  useAI: boolean;
  aiSummaryLength: "brief" | "medium" | "detailed";
  resume: boolean;
  concurrency: number;
  delay: number;
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

const PROGRESS_FILE = path.join(process.cwd(), ".import-progress.json");

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const result: Record<string, string | boolean | number | undefined> = {
    limit: "10",
    build: true,
    dryRun: false,
    useAI: true,
    aiSummaryLength: "medium",
    resume: false,
    concurrency: "2",
    delay: "1000"
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
    if (arg === "--no-ai") {
      result.useAI = false;
      continue;
    }
    if (arg === "--resume") {
      result.resume = true;
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

  const concurrency = Number(result.concurrency ?? 2);
  const delay = Number(result.delay ?? 1000);

  return {
    url: result.url,
    category,
    tags,
    limit,
    lang: typeof result.lang === "string" ? result.lang : undefined,
    build: result.build === true,
    dryRun: result.dryRun === true,
    useAI: result.useAI !== false,
    aiSummaryLength: (result.aiSummaryLength as "brief" | "medium" | "detailed") || "medium",
    resume: result.resume === true,
    concurrency,
    delay
  };
}

async function loadProgress(): Promise<Set<string>> {
  try {
    const content = await fs.readFile(PROGRESS_FILE, "utf-8");
    const data = JSON.parse(content);
    return new Set(data.processed || []);
  } catch {
    return new Set();
  }
}

async function saveProgress(processed: Set<string>): Promise<void> {
  await fs.writeFile(PROGRESS_FILE, JSON.stringify({ processed: [...processed] }, null, 2), "utf-8");
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

        const handle = extractFirst([/"handle":"(@[^"]+)"/.exec(html)]) || (/@[A-Za-z0-9_\-\.]+/.exec(base)?.[0]);

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
  const regex = new RegExp(String.raw`<${tag}[^>]*>([\s\S]*?)<\/${tag}>`, "i");
  let match = regex.exec(xml);
  if (!match && tag.includes(":")) {
    const local = tag.split(":").pop() ?? tag;
    const fallback = new RegExp(String.raw`<[^>]*${local}[^>]*>([\s\S]*?)<\/[^>]*${local}>`, "i");
    match = fallback.exec(xml);
  }
  if (!match) {
    return undefined;
  }
  return cleanText(match[1]);
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
  const entries = Array.from(xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g));

  const videos = entries.slice(0, limit).map((entry) => {
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

  const channelTitle = matchTag(xml, "title");
  return {
    title: channelTitle,
    videos
  };
}

function extractHashtags(description: string): string[] {
  const matches = description.match(/#([A-Za-z0-9_\-]+)/g) || [];
  return Array.from(new Set(matches.map((tag) => tag.replace(/^#/, "").toLowerCase())));
}

function createProgressBar(current: number, total: number, width = 30): string {
  const filled = Math.round((current / total) * width);
  const empty = width - filled;
  return `[${"█".repeat(filled)}${"░".repeat(empty)}] ${current}/${total}`;
}

async function main() {
  const options = parseArgs();
  const tmpDir = await ensureTmpDir();

  console.log("🎬 YouTube Channel Import (Enhanced)");
  console.log("=====================================\n");

  const channel = await resolveChannelInfo(options.url);
  console.log(`Channel: ${channel.name}`);
  if (channel.handle) console.log(`Handle: ${channel.handle}`);
  console.log(`URL: ${channel.url}\n`);

  const processedIds = options.resume ? await loadProgress() : new Set<string>();
  if (options.resume && processedIds.size > 0) {
    console.log(`Resuming: ${processedIds.size} videos already processed\n`);
  }

  const { videos, title: feedTitle } = await fetchChannelFeed(channel.id, options.limit);
  if (feedTitle && (!channel.name || /home/i.test(channel.name))) {
    channel.name = feedTitle;
  }

  if (!videos.length) {
    console.log("No videos found for channel feed");
    return;
  }

  const videosToProcess = videos.filter((v) => !processedIds.has(v.id));
  const skippedCount = videos.length - videosToProcess.length;

  console.log(`Found ${videos.length} videos (${skippedCount} already processed, ${videosToProcess.length} to process)\n`);

  if (videosToProcess.length === 0) {
    console.log("✅ All videos already processed!");
    return;
  }

  if (options.dryRun) {
    console.log("🔍 DRY RUN - Would process:");
    for (const video of videosToProcess) {
      console.log(`  - ${video.title}`);
    }
    return;
  }

  const transcriptService = new TranscriptService({
    defaultLanguages: options.lang ? [options.lang, "en"] : ["en"],
    cacheEnabled: true
  });
  await transcriptService.initialize();

  const aiSummarizer = options.useAI
    ? new AISummarizer({ defaultSummaryLength: options.aiSummaryLength })
    : null;
  if (aiSummarizer) {
    await aiSummarizer.initialize();
  }

  const failures: Array<{ video: FeedVideo; error: string }> = [];
  let successCount = 0;
  let transcriptCount = 0;
  let aiSummaryCount = 0;

  for (let i = 0; i < videosToProcess.length; i += options.concurrency) {
    const batch = videosToProcess.slice(i, i + options.concurrency);

    console.log(`\n📦 Processing batch ${Math.floor(i / options.concurrency) + 1}/${Math.ceil(videosToProcess.length / options.concurrency)}`);

    await Promise.all(
      batch.map(async (video) => {
        const videoNum = i + batch.indexOf(video) + 1;
        console.log(`\n[${videoNum}/${videosToProcess.length}] ${video.title}`);
        console.log(`    ${createProgressBar(videoNum, videosToProcess.length)}`);

        const createdAt = new Date(video.published).toISOString().slice(0, 10);
        const hashtags = extractHashtags(video.description);

        const combinedTags = new Set<string>([
          ...options.tags.map((tag) => tag.toLowerCase()),
          ...hashtags
        ]);

        console.log(`    Fetching transcript...`);
        const transcriptResult = await transcriptService.fetchTranscript(video.id);

        let transcript = "";
        let hasTranscript = false;

        if ("error" in transcriptResult) {
          console.log(`    ⚠️  Transcript unavailable: ${transcriptResult.errorType}`);
          combinedTags.add("needs-transcript");
        } else {
          transcript = transcriptResult.transcript;
          hasTranscript = true;
          transcriptCount++;
          console.log(`    ✓ Transcript (${transcript.length.toLocaleString()} chars)`);
        }

        let aiSummary: string | undefined;
        if (hasTranscript && aiSummarizer) {
          console.log(`    Generating AI summary...`);
          const summaryResult = await aiSummarizer.summarize(video.id, transcript, {
            title: video.title,
            category: options.category
          });

          if ("error" in summaryResult) {
            console.log(`    ⚠️  AI summary failed: ${summaryResult.error}`);
          } else {
            aiSummary = summaryResult.summary;
            aiSummaryCount++;
            console.log(`    ✓ AI summary (${summaryResult.tokensUsed} tokens)`);
          }
        }

        const summary = aiSummary || video.description.slice(0, 200) || `Video from ${channel.name}`;

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
          createdAt,
          "--no-build"
        ];

        if (combinedTags.size) {
          args.push("--tags", Array.from(combinedTags).join(","));
        }

        const summaryFile = path.join(tmpDir, `${video.id}-summary.md`);
        await fs.writeFile(summaryFile, summary, "utf-8");
        args.push("--summaryFile", summaryFile);

        if (hasTranscript) {
          const transcriptFile = path.join(tmpDir, `${video.id}-transcript.md`);
          await fs.writeFile(transcriptFile, transcript, "utf-8");
          args.push("--transcriptFile", transcriptFile);
        }

        const result = spawnSync("npx", args, { stdio: "pipe" });

        if (result.status !== 0) {
          const error = result.stderr?.toString() || "Unknown error";
          console.log(`    ❌ Failed: ${error.slice(0, 100)}`);
          failures.push({ video, error });
        } else {
          console.log(`    ✅ Added to corpus`);
          successCount++;
          processedIds.add(video.id);
          await saveProgress(processedIds);
        }
      })
    );

    if (i + options.concurrency < videosToProcess.length && options.delay > 0) {
      console.log(`\n⏳ Waiting ${options.delay}ms before next batch...`);
      await new Promise((resolve) => setTimeout(resolve, options.delay));
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 IMPORT SUMMARY");
  console.log("=".repeat(50));
  console.log(`Total videos:      ${videosToProcess.length}`);
  console.log(`Successfully added: ${successCount}`);
  console.log(`With transcripts:  ${transcriptCount}`);
  if (options.useAI) {
    console.log(`With AI summaries: ${aiSummaryCount}`);
  }
  console.log(`Failed:            ${failures.length}`);

  if (!options.dryRun && options.build) {
    console.log("\n🔨 Rebuilding Markdown...");
    const buildResult = spawnSync("npx", ["tsx", "scripts/build-md.ts"], {
      stdio: "inherit"
    });
    if (buildResult.status !== 0) {
      console.warn("⚠️  Failed to rebuild markdown");
    }
  }

  if (failures.length) {
    console.log("\n❌ FAILURES:");
    failures.forEach(({ video, error }) => {
      console.log(`  - ${video.title}: ${error.slice(0, 100)}`);
    });

    await fs.writeFile(
      path.join(process.cwd(), ".import-failures.json"),
      JSON.stringify(failures.map((f) => ({ title: f.video.title, url: f.video.url, error: f.error })), null, 2),
      "utf-8"
    );
    console.log("\nFailures saved to .import-failures.json");

    process.exitCode = 1;
  } else {
    console.log("\n✅ Channel import completed successfully!");
    try {
      await fs.unlink(PROGRESS_FILE);
    } catch {
      // Ignore
    }
  }
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
