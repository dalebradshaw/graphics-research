#!/usr/bin/env node
/**
 * Batch Transcript Processor for Ducky3D Videos
 * 
 * Processes videos that need transcripts:
 * 1. Downloads transcripts using yt-dlp-extractor
 * 2. Updates transcript markdown files
 * 3. Updates corpus.json entries
 * 4. Removes "needs-transcript" tag on success
 */

import { promises as fs } from "fs";
import path from "path";
import { YtDlpTranscriptExtractor, YtDlpTranscriptResult } from "./yt-dlp-extractor.js";

// Video IDs to process with their titles for reference
const VIDEOS_TO_PROCESS = [
  { id: "7dm776rZz-s", title: "Generative landscape animation" },
  { id: "SerF_8yCVDA", title: "Light trails" },
  { id: "syfDKEpSf54", title: "Shader animation" },
  { id: "965bgIUHoxA", title: "Light trails with camera" },
  { id: "dhYL2OTMR9o", title: "Logo particles" },
  { id: "45HruJxNBcY", title: "Particle systems" },
  { id: "t61gMdBXjQw", title: "Geometry nodes learning" },
  { id: "x07cPMM6A-Q", title: "Sci-fi environment" },
  { id: "lI1DMK9TCeg", title: "Visual hierarchy" },
  { id: "FJ6nEmjGWa8", title: "Simulation zones strings" },
  { id: "0lBaaCMpZGs", title: "Self-teaching" },
  { id: "jUPqd8_Ig7g", title: "Logo concepts" },
  { id: "cbS86G0mqrU", title: "Logo particle animation" },
  { id: "oC6guqEK9J4", title: "Blob tracking" },
  { id: "nJ1TWyYvgco", title: "Metaballs" },
];

const CORPUS_PATH = path.join(process.cwd(), "corpus", "corpus.json");
const TRANSCRIPTS_DIR = path.join(process.cwd(), "transcripts");
const RAW_TRANSCRIPTS_DIR = path.join(process.cwd(), "transcripts-raw");

interface ProcessingResult {
  videoId: string;
  title: string;
  success: boolean;
  error?: string;
  transcriptLength?: number;
  wordCount?: number;
}

async function loadCorpus(): Promise<any[]> {
  console.log("📚 Loading corpus...");
  const content = await fs.readFile(CORPUS_PATH, "utf-8");
  return JSON.parse(content);
}

async function saveCorpus(corpus: any[]): Promise<void> {
  await fs.writeFile(CORPUS_PATH, JSON.stringify(corpus, null, 2), "utf-8");
}

async function readExistingTranscript(videoId: string): Promise<{ hasContent: boolean; content: string }> {
  const transcriptPath = path.join(TRANSCRIPTS_DIR, `${videoId}.md`);
  try {
    const content = await fs.readFile(transcriptPath, "utf-8");
    // Check if it has actual transcript content or just a placeholder
    const hasContent = content.includes("## Transcript") && 
                       !content.includes("Transcript not available yet");
    return { hasContent, content };
  } catch {
    return { hasContent: false, content: "" };
  }
}

async function updateTranscriptFile(
  videoId: string, 
  title: string, 
  transcript: string,
  corpusEntry: any
): Promise<void> {
  const transcriptPath = path.join(TRANSCRIPTS_DIR, `${videoId}.md`);
  
  // Build the markdown content
  let markdown = `# ${corpusEntry.title || title}\n\n`;
  markdown += `**Video:** https://www.youtube.com/watch?v=${videoId}\n\n`;
  
  if (corpusEntry.summary) {
    markdown += `## Summary\n${corpusEntry.summary}\n\n`;
  }
  
  if (corpusEntry.notes) {
    markdown += `## Notes\n${corpusEntry.notes}\n\n`;
  }
  
  markdown += `## Transcript\n${transcript}\n`;
  
  await fs.writeFile(transcriptPath, markdown, "utf-8");
}

function updateCorpusEntry(entry: any, transcriptLength: number): any {
  // Remove "needs-transcript" tag
  if (entry.tags) {
    entry.tags = entry.tags.filter((tag: string) => tag !== "needs-transcript");
  }
  
  // Update hasTranscript flag
  entry.hasTranscript = true;
  
  // Ensure transcript URL is set
  if (!entry.urls) {
    entry.urls = {};
  }
  entry.urls.transcript = `transcripts/${entry.id.replace("yt-", "")}.md`;
  
  return entry;
}

async function processVideo(
  videoInfo: { id: string; title: string },
  extractor: YtDlpTranscriptExtractor,
  corpus: any[]
): Promise<ProcessingResult> {
  const { id: videoId, title } = videoInfo;
  
  console.log(`\n🎬 Processing: ${title} (${videoId})`);
  
  // Find corpus entry
  const entryIndex = corpus.findIndex(e => e.id === `yt-${videoId}`);
  if (entryIndex === -1) {
    console.log(`   ⚠️  Corpus entry not found for yt-${videoId}`);
    return { videoId, title, success: false, error: "Corpus entry not found" };
  }
  
  const entry = corpus[entryIndex];
  
  // Check if we already have transcript content
  const existing = await readExistingTranscript(videoId);
  if (existing.hasContent) {
    console.log(`   ✅ Already has transcript (${existing.content.length} chars)`);
    
    // Update corpus entry even if transcript exists
    corpus[entryIndex] = updateCorpusEntry(entry, existing.content.length);
    
    return { 
      videoId, 
      title, 
      success: true, 
      transcriptLength: existing.content.length,
      wordCount: existing.content.split(/\s+/).length
    };
  }
  
  // Extract transcript using yt-dlp
  console.log(`   ⏳ Downloading transcript...`);
  const result = await extractor.extractTranscript({ videoId });
  
  if (result.error || !result.transcript) {
    const errorMsg = result.error || "No transcript returned";
    console.log(`   ❌ Failed: ${errorMsg}`);
    return { videoId, title, success: false, error: errorMsg };
  }
  
  // Check if we got meaningful content
  const transcriptText = result.transcript.trim();
  if (transcriptText.length < 100) {
    console.log(`   ⚠️  Transcript too short (${transcriptText.length} chars)`);
    return { videoId, title, success: false, error: "Transcript too short" };
  }
  
  console.log(`   ✅ Transcript downloaded (${transcriptText.length} chars, ${transcriptText.split(/\s+/).length} words)`);
  
  // Update transcript file
  await updateTranscriptFile(videoId, title, transcriptText, entry);
  console.log(`   📝 Updated transcript file`);
  
  // Update corpus entry
  corpus[entryIndex] = updateCorpusEntry(entry, transcriptText.length);
  console.log(`   📚 Updated corpus entry`);
  
  return { 
    videoId, 
    title, 
    success: true, 
    transcriptLength: transcriptText.length,
    wordCount: transcriptText.split(/\s+/).length
  };
}

async function main() {
  console.log("=".repeat(60));
  console.log("🎥 Ducky3D Transcript Batch Processor");
  console.log("=".repeat(60));
  console.log(`\nProcessing ${VIDEOS_TO_PROCESS.length} videos...\n`);
  
  // Initialize
  const extractor = new YtDlpTranscriptExtractor(RAW_TRANSCRIPTS_DIR);
  await extractor.initialize();
  
  // Load corpus
  const corpus = await loadCorpus();
  console.log(`Loaded ${corpus.length} corpus entries\n`);
  
  // Process all videos
  const results: ProcessingResult[] = [];
  
  for (let i = 0; i < VIDEOS_TO_PROCESS.length; i++) {
    const videoInfo = VIDEOS_TO_PROCESS[i];
    console.log(`\n[${i + 1}/${VIDEOS_TO_PROCESS.length}]`);
    
    const result = await processVideo(videoInfo, extractor, corpus);
    results.push(result);
    
    // Small delay between requests to be respectful
    if (i < VIDEOS_TO_PROCESS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Save updated corpus
  console.log("\n\n💾 Saving updated corpus...");
  await saveCorpus(corpus);
  console.log("✅ Corpus saved");
  
  // Report statistics
  console.log("\n" + "=".repeat(60));
  console.log("📊 Processing Report");
  console.log("=".repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`\n✅ Successful: ${successful.length}/${VIDEOS_TO_PROCESS.length}`);
  console.log(`❌ Failed: ${failed.length}/${VIDEOS_TO_PROCESS.length}`);
  
  if (successful.length > 0) {
    const totalWords = successful.reduce((sum, r) => sum + (r.wordCount || 0), 0);
    const avgWords = Math.round(totalWords / successful.length);
    console.log(`\n📝 Total words added: ${totalWords.toLocaleString()}`);
    console.log(`📄 Average words per video: ${avgWords.toLocaleString()}`);
    
    console.log("\n✅ Successful Videos:");
    successful.forEach(r => {
      console.log(`   ✓ ${r.title} (${r.videoId}) - ${r.wordCount?.toLocaleString()} words`);
    });
  }
  
  if (failed.length > 0) {
    console.log("\n❌ Failed Videos:");
    failed.forEach(r => {
      console.log(`   ✗ ${r.title} (${r.videoId}) - ${r.error}`);
    });
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("🎉 Batch processing complete!");
  console.log("=".repeat(60));
}

main().catch(error => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
