import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { YouTube } from "youtube-sr";
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
    throw new Error("Missing required --url (channel URL)");
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

async function main() {
  const options = parseArgs();
  const tmpDir = await ensureTmpDir();
  const channel = await YouTube.getChannel(options.url, {
    fetchVideos: true,
    sort: "newest"
  });

  if (!channel?.videos?.length) {
    throw new Error("Failed to resolve channel information or no videos available");
  }

  const videos = channel.videos.slice(0, options.limit);
  if (!videos.length) {
    console.log("No videos found for channel");
    return;
  }

  console.log(`Found ${videos.length} videos for channel ${channel.name}`);

  const failures: string[] = [];

  for (const [index, video] of videos.entries()) {
    const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;
    const createdAtIso = video.uploadedTimestamp
      ? new Date(video.uploadedTimestamp).toISOString()
      : new Date().toISOString();
    const createdAt = createdAtIso.slice(0, 10);
    const baseSummary = video.description?.split("\n").map((line) => line.trim()).filter(Boolean)[0];
    const summary = baseSummary || `Auto-ingested from channel ${channel.name}.`;

    console.log(`\n[${index + 1}/${videos.length}] ${video.title}`);
    console.log(`  URL: ${videoUrl}`);

    let transcript = "";
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
      videoUrl,
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
      failures.push(videoUrl);
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
