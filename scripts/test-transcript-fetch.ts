import { promises as fs } from "fs";
import { TranscriptService } from "./transcript-service.js";

async function testTranscriptFetch() {
  const service = new TranscriptService();
  await service.initialize();
  
  console.log("Testing transcript fetch for Ducky3D video...\n");
  
  const videoId = "7dm776rZz-s";
  console.log(`📺 Video ID: ${videoId}`);
  console.log("🔍 Fetching transcript...\n");
  
  try {
    const result = await service.fetchTranscript(videoId);
    
    if ("error" in result) {
      console.log("❌ Failed to fetch transcript:");
      console.log(`   Error: ${result.error}`);
      console.log(`   Type: ${result.errorType}`);
      console.log(`   Retryable: ${result.retryable}`);
    } else {
      console.log("✅ Transcript fetched successfully!");
      console.log(`   Length: ${result.transcript.length} characters`);
      console.log(`   Language: ${result.language}`);
      console.log(`   Duration: ${Math.round(result.duration / 60)} minutes`);
      console.log(`   Cached: ${result.cached}`);
      console.log(`   Fetch time: ${result.fetchDurationMs}ms`);
      console.log("\n📝 First 500 characters:");
      console.log(result.transcript.slice(0, 500) + "...");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

testTranscriptFetch();
