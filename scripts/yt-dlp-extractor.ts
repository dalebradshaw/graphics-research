import { promises as fs } from "fs";
import path from "path";
import { spawn } from "child_process";

export interface YtDlpTranscriptOptions {
  videoId: string;
  url?: string;
  language?: string;
  outputDir?: string;
}

export interface YtDlpTranscriptResult {
  videoId: string;
  transcript: string;
  language: string;
  duration?: number;
  title?: string;
  filePath?: string;
  error?: string;
}

export class YtDlpTranscriptExtractor {
  private outputDir: string;

  constructor(outputDir: string = "./transcripts-raw") {
    this.outputDir = outputDir;
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.outputDir, { recursive: true });
  }

  async extractTranscript(options: YtDlpTranscriptOptions): Promise<YtDlpTranscriptResult> {
    const videoId = options.videoId;
    const url = options.url || `https://www.youtube.com/watch?v=${videoId}`;
    const lang = options.language || "en";

    const tempDir = path.join(this.outputDir, `tmp-${videoId}`);
    await fs.mkdir(tempDir, { recursive: true });

    try {
      // Download subtitles using yt-dlp
      const cmd = `yt-dlp --write-auto-subs --sub-langs ${lang} --convert-subs srt --skip-download --output "${tempDir}/%(id)s.%(ext)s" "${url}"`;
      
      await new Promise((resolve, reject) => {
        const process = spawn("bash", ["-c", cmd], {
          stdio: ["pipe", "pipe", "pipe"]
        });

        let stderr = "";
        process.stderr.on("data", (data) => {
          stderr += data.toString();
        });

        process.on("close", (code) => {
          if (code === 0 || stderr.includes("Downloading webpage")) {
            resolve(null);
          } else {
            reject(new Error(`yt-dlp failed: ${stderr}`));
          }
        });

        process.on("error", reject);
      });

      // Find the downloaded subtitle file
      const files = await fs.readdir(tempDir);
      const srtFile = files.find(f => f.endsWith(".srt"));

      if (!srtFile) {
        return {
          videoId,
          transcript: "",
          language: lang,
          error: "No subtitle file generated"
        };
      }

      // Read and parse the SRT file
      const srtPath = path.join(tempDir, srtFile);
      const srtContent = await fs.readFile(srtPath, "utf-8");
      const transcript = this.parseSRT(srtContent);

      // Move to final location
      const finalPath = path.join(this.outputDir, `${videoId}.txt`);
      await fs.writeFile(finalPath, transcript, "utf-8");

      // Cleanup temp dir
      await fs.rm(tempDir, { recursive: true, force: true });

      return {
        videoId,
        transcript,
        language: lang,
        filePath: finalPath
      };

    } catch (error) {
      // Cleanup on error
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {}

      return {
        videoId,
        transcript: "",
        language: lang,
        error: (error as Error).message
      };
    }
  }

  private parseSRT(content: string): string {
    // Remove SRT timing info and format as plain text
    const lines = content.split("\n");
    const textLines: string[] = [];
    
    for (const line of lines) {
      // Skip empty lines, numbers, and timing lines (contain -->)
      if (!line.trim()) continue;
      if (/^\d+$/.test(line.trim())) continue; // Line number
      if (line.includes("-->")) continue; // Timing line
      
      textLines.push(line.trim());
    }
    
    // Join and clean up
    return textLines
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  async extractBatch(
    videoIds: string[],
    onProgress?: (completed: number, total: number, current: string) => void
  ): Promise<YtDlpTranscriptResult[]> {
    const results: YtDlpTranscriptResult[] = [];
    
    for (let i = 0; i < videoIds.length; i++) {
      const videoId = videoIds[i];
      
      if (onProgress) {
        onProgress(i + 1, videoIds.length, videoId);
      }
      
      const result = await this.extractTranscript({ videoId });
      results.push(result);
      
      // Small delay to be respectful
      if (i < videoIds.length - 1) {
        await this.sleep(1000);
      }
    }
    
    return results;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("Usage: npx tsx scripts/yt-dlp-extractor.ts <video-id-or-url> [output-dir]");
    console.log("Examples:");
    console.log("  npx tsx scripts/yt-dlp-extractor.ts 7dm776rZz-s");
    console.log("  npx tsx scripts/yt-dlp-extractor.ts https://youtube.com/watch?v=7dm776rZz-s ./transcripts");
    process.exit(1);
  }

  const input = args[0];
  const outputDir = args[1] || "./transcripts-raw";
  
  // Extract video ID from URL or use as-is
  let videoId = input;
  let url = input;
  
  if (input.includes("youtube.com") || input.includes("youtu.be")) {
    const match = input.match(/[?&]v=([^&#]+)/) || input.match(/youtu\.be\/([^?&#]+)/);
    if (match) {
      videoId = match[1];
    }
  } else {
    url = `https://www.youtube.com/watch?v=${input}`;
  }

  console.log(`📺 Extracting transcript for: ${videoId}`);
  console.log(`   Output: ${outputDir}\n`);

  const extractor = new YtDlpTranscriptExtractor(outputDir);
  await extractor.initialize();
  
  const result = await extractor.extractTranscript({ videoId, url });
  
  if (result.error) {
    console.error(`❌ Error: ${result.error}`);
    process.exit(1);
  }

  console.log(`✅ Transcript extracted!`);
  console.log(`   Length: ${result.transcript.length} characters`);
  console.log(`   Words: ${result.transcript.split(/\s+/).length}`);
  if (result.filePath) {
    console.log(`   File: ${result.filePath}`);
  }
  console.log(`\n📝 First 500 characters:`);
  console.log(result.transcript.slice(0, 500) + "...");
}

if (require.main === module) {
  main().catch(console.error);
}
