import { promises as fs } from "fs";
import path from "path";

const ROOT = process.cwd();
const TRANSCRIPTS_RAW_DIR = path.join(ROOT, "transcripts-raw");
const TRANSCRIPTS_DIR = path.join(ROOT, "transcripts");
const CORPUS_JSON_PATH = path.join(ROOT, "corpus", "corpus.json");

interface SrtEntry {
  index: number;
  startTime: string;
  endTime: string;
  text: string;
}

function parseSRT(content: string): string {
  const lines = content.split("\n");
  const textParts: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    // Skip index numbers
    if (/^\d+$/.test(line)) continue;
    
    // Skip timing lines (contain -->)
    if (line.includes("-->")) continue;
    
    // This is text content
    textParts.push(line);
  }
  
  // Join and clean up
  return textParts
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n\n")
    .trim();
}

function extractVideoId(filename: string): string | null {
  const match = filename.match(/\[([^\]]+)\]/);
  return match ? match[1] : null;
}

async function processTranscripts() {
  console.log("📝 Processing Ducky3D Transcripts");
  console.log("=================================\n");
  
  // Ensure directories exist
  await fs.mkdir(TRANSCRIPTS_DIR, { recursive: true });
  
  // Read all SRT files
  const files = await fs.readdir(TRANSCRIPTS_RAW_DIR);
  const srtFiles = files.filter(f => f.endsWith(".srt"));
  
  console.log(`Found ${srtFiles.length} transcript files to process\n`);
  
  // Read corpus
  const corpusRaw = await fs.readFile(CORPUS_JSON_PATH, "utf-8");
  const corpus = JSON.parse(corpusRaw);
  
  let processedCount = 0;
  let updatedCount = 0;
  
  for (const srtFile of srtFiles) {
    const videoId = extractVideoId(srtFile);
    if (!videoId) {
      console.warn(`⚠️  Could not extract video ID from: ${srtFile}`);
      continue;
    }
    
    console.log(`[${++processedCount}/${srtFiles.length}] Processing: ${videoId}`);
    
    // Read and parse SRT
    const srtPath = path.join(TRANSCRIPTS_RAW_DIR, srtFile);
    const srtContent = await fs.readFile(srtPath, "utf-8");
    const transcript = parseSRT(srtContent);
    
    console.log(`   Transcript length: ${transcript.length} characters`);
    console.log(`   Word count: ${transcript.split(/\s+/).length}`);
    
    // Create markdown file
    const entryId = `yt-${videoId}`;
    const corpusEntry = corpus.find((e: any) => e.id === entryId);
    
    if (!corpusEntry) {
      console.warn(`   ⚠️  No corpus entry found for ${entryId}`);
      continue;
    }
    
    const title = corpusEntry.title || "Ducky3D Tutorial";
    const videoUrl = corpusEntry.urls?.video || `https://www.youtube.com/watch?v=${videoId}`;
    const existingNotes = corpusEntry.notes || "";
    const summary = corpusEntry.summary || "";
    
    // Create markdown content
    const markdownLines: string[] = [];
    markdownLines.push(`# ${title}`);
    markdownLines.push("");
    markdownLines.push(`**Video:** ${videoUrl}`);
    markdownLines.push(`**Video ID:** ${videoId}`);
    if (summary) {
      markdownLines.push("");
      markdownLines.push("## Summary");
      markdownLines.push(summary);
    }
    if (existingNotes) {
      markdownLines.push("");
      markdownLines.push("## Notes");
      markdownLines.push(existingNotes);
    }
    markdownLines.push("");
    markdownLines.push("## Transcript");
    markdownLines.push(transcript);
    markdownLines.push("");
    
    // Write transcript file
    const transcriptPath = path.join(TRANSCRIPTS_DIR, `${videoId}.md`);
    await fs.writeFile(transcriptPath, markdownLines.join("\n"), "utf-8");
    console.log(`   ✅ Saved: ${path.relative(ROOT, transcriptPath)}`);
    
    // Update corpus entry
    const entryIndex = corpus.findIndex((e: any) => e.id === entryId);
    if (entryIndex >= 0) {
      // Remove needs-transcript tag if present
      const tags = corpus[entryIndex].tags || [];
      const filteredTags = tags.filter((t: string) => t !== "needs-transcript");
      
      corpus[entryIndex] = {
        ...corpus[entryIndex],
        hasTranscript: true,
        tags: filteredTags,
        urls: {
          ...corpus[entryIndex].urls,
          transcript: `transcripts/${videoId}.md`
        }
      };
      updatedCount++;
      console.log(`   ✅ Updated corpus entry: ${entryId}`);
    }
    
    console.log("");
  }
  
  // Save updated corpus
  await fs.writeFile(CORPUS_JSON_PATH, JSON.stringify(corpus, null, 2) + "\n", "utf-8");
  console.log(`✅ Updated corpus: ${path.relative(ROOT, CORPUS_JSON_PATH)}`);
  
  console.log("\n📊 Summary:");
  console.log(`   Processed: ${processedCount} transcripts`);
  console.log(`   Updated corpus: ${updatedCount} entries`);
  console.log(`   Total transcript text: ${(await getTotalTranscriptSize())} characters`);
}

async function getTotalTranscriptSize(): Promise<number> {
  const files = await fs.readdir(TRANSCRIPTS_DIR);
  let total = 0;
  for (const file of files.filter(f => f.endsWith(".md"))) {
    const content = await fs.readFile(path.join(TRANSCRIPTS_DIR, file), "utf-8");
    total += content.length;
  }
  return total;
}

processTranscripts().catch(console.error);
