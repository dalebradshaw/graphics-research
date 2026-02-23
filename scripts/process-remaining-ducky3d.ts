import { promises as fs } from "fs";
import path from "path";
import { spawn } from "child_process";

const ROOT = process.cwd();
const TRANSCRIPTS_RAW_DIR = path.join(ROOT, "transcripts-raw");
const TRANSCRIPTS_DIR = path.join(ROOT, "transcripts");
const CORPUS_JSON_PATH = path.join(ROOT, "corpus", "corpus.json");

// Remaining 10 Ducky3D videos to process
const REMAINING_VIDEOS = [
  { id: "45HruJxNBcY", title: "Particle Systems" },
  { id: "t61gMdBXjQw", title: "Geometry Nodes Learning" },
  { id: "x07cPMM6A-Q", title: "Sci-Fi Environment" },
  { id: "lI1DMK9TCeg", title: "Visual Hierarchy" },
  { id: "FJ6nEmjGWa8", title: "Simulation Zones Strings" },
  { id: "0lBaaCMpZGs", title: "Self-Teaching Method" },
  { id: "jUPqd8_Ig7g", title: "Logo Concepts" },
  { id: "cbS86G0mqrU", title: "Logo Particle Animation" },
  { id: "oC6guqEK9J4", title: "Blob Tracking" },
  { id: "nJ1TWyYvgco", title: "Metaballs" },
];

function parseSRT(content: string): string {
  const lines = content.split("\n");
  const textParts: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^\d+$/.test(trimmed)) continue;
    if (trimmed.includes("-->")) continue;
    textParts.push(trimmed);
  }
  
  return textParts.join(" ").replace(/\s+/g, " ").trim();
}

async function downloadTranscript(videoId: string): Promise<boolean> {
  return new Promise((resolve) => {
    const cmd = `yt-dlp --write-auto-subs --sub-langs en --convert-subs srt --skip-download --output "${TRANSCRIPTS_RAW_DIR}/%(title)s [%(id)s].%(ext)s" "https://www.youtube.com/watch?v=${videoId}"`;
    
    const process = spawn("bash", ["-c", cmd]);
    let output = "";
    
    process.stdout.on("data", (data) => {
      output += data.toString();
    });
    
    process.stderr.on("data", (data) => {
      output += data.toString();
    });
    
    process.on("close", () => {
      resolve(output.includes("Writing video subtitles"));
    });
    
    process.on("error", () => resolve(false));
  });
}

async function findSrtFile(videoId: string): Promise<string | null> {
  const files = await fs.readdir(TRANSCRIPTS_RAW_DIR);
  const srtFile = files.find(f => f.includes(videoId) && f.endsWith(".srt"));
  return srtFile || null;
}

async function processRemaining() {
  console.log("🎬 Processing Remaining 10 Ducky3D Videos");
  console.log("==========================================\n");
  
  await fs.mkdir(TRANSCRIPTS_DIR, { recursive: true });
  
  const corpusRaw = await fs.readFile(CORPUS_JSON_PATH, "utf-8");
  const corpus = JSON.parse(corpusRaw);
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < REMAINING_VIDEOS.length; i++) {
    const video = REMAINING_VIDEOS[i];
    console.log(`[${i + 1}/${REMAINING_VIDEOS.length}] ${video.title}`);
    console.log(`    Video ID: ${video.id}`);
    
    // Check if already processed
    const entryId = `yt-${video.id}`;
    const existingEntry = corpus.find((e: any) => e.id === entryId);
    
    if (existingEntry?.hasTranscript) {
      console.log(`    ⏭️  Already has transcript, skipping`);
      successCount++;
      console.log("");
      continue;
    }
    
    // Download transcript
    console.log(`    📥 Downloading...`);
    const downloaded = await downloadTranscript(video.id);
    
    if (!downloaded) {
      console.log(`    ❌ Failed to download transcript`);
      failCount++;
      console.log("");
      continue;
    }
    
    // Find the downloaded file
    const srtFile = await findSrtFile(video.id);
    if (!srtFile) {
      console.log(`    ❌ SRT file not found`);
      failCount++;
      console.log("");
      continue;
    }
    
    // Process transcript
    const srtPath = path.join(TRANSCRIPTS_RAW_DIR, srtFile);
    const srtContent = await fs.readFile(srtPath, "utf-8");
    const transcript = parseSRT(srtContent);
    
    console.log(`    ✅ Downloaded: ${transcript.length} chars, ${transcript.split(/\s+/).length} words`);
    
    if (existingEntry) {
      // Create markdown
      const title = existingEntry.title || video.title;
      const videoUrl = existingEntry.urls?.video || `https://www.youtube.com/watch?v=${video.id}`;
      const existingNotes = existingEntry.notes || "";
      const summary = existingEntry.summary || "";
      
      const lines: string[] = [];
      lines.push(`# ${title}`);
      lines.push("");
      lines.push(`**Video:** ${videoUrl}`);
      lines.push(`**Video ID:** ${video.id}`);
      if (summary) {
        lines.push("");
        lines.push("## Summary");
        lines.push(summary);
      }
      if (existingNotes) {
        lines.push("");
        lines.push("## Notes");
        lines.push(existingNotes);
      }
      lines.push("");
      lines.push("## Transcript");
      lines.push(transcript);
      lines.push("");
      
      const transcriptPath = path.join(TRANSCRIPTS_DIR, `${video.id}.md`);
      await fs.writeFile(transcriptPath, lines.join("\n"), "utf-8");
      
      // Update corpus
      const tags = existingEntry.tags || [];
      const filteredTags = tags.filter((t: string) => t !== "needs-transcript");
      
      const entryIndex = corpus.findIndex((e: any) => e.id === entryId);
      corpus[entryIndex] = {
        ...existingEntry,
        hasTranscript: true,
        tags: filteredTags,
        urls: {
          ...existingEntry.urls,
          transcript: `transcripts/${video.id}.md`
        }
      };
      
      console.log(`    ✅ Saved and updated corpus`);
      successCount++;
    } else {
      console.log(`    ⚠️  No corpus entry found`);
      failCount++;
    }
    
    console.log("");
    
    // Small delay
    if (i < REMAINING_VIDEOS.length - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  
  // Save corpus
  await fs.writeFile(CORPUS_JSON_PATH, JSON.stringify(corpus, null, 2) + "\n", "utf-8");
  
  console.log("\n✅ Processing Complete!");
  console.log(`   Success: ${successCount}/${REMAINING_VIDEOS.length}`);
  console.log(`   Failed: ${failCount}/${REMAINING_VIDEOS.length}`);
}

processRemaining().catch(console.error);
