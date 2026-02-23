import { spawn } from "child_process";
import { promises as fs } from "fs";
import fsSync from "fs";
import path from "path";
import os from "os";

const ROOT = process.cwd();

// Category detection rules
const CATEGORY_RULES: Array<{
  category: string;
  keywords: string[];
}> = [
  { category: "React Three Fiber", keywords: ["react-three-fiber", "r3f", "react three fiber"] },
  { category: "Three.js", keywords: ["three.js", "threejs", "webgl"] },
  { category: "Shaders/WebGL", keywords: ["shader", "glsl", "tsl", "webgpu", "fragment shader", "vertex shader"] },
  { category: "Blender", keywords: ["blender", "geometry nodes", "b3d", "cycles", "eevee"] },
  { category: "AI Tools", keywords: ["ai", "claude", "gpt", "llm", "copilot", "agentic", "mcp", "cursor", "codeium"] },
  { category: "Design", keywords: ["design", "typography", "font", "ui", "ux", "figma"] },
  { category: "Development", keywords: ["javascript", "typescript", "react", "nextjs", "vercel", "github"] },
  { category: "Robotics/Hardware", keywords: ["robotics", "hardware", "arduino", "raspberry pi", "pick and place", "circuit", "lumenpnp"] }
];

function detectCategory(text: string): string {
  const lowerText = text.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(kw => lowerText.includes(kw.toLowerCase()))) {
      return rule.category;
    }
  }
  return "Other";
}

function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s]+/g;
  const matches = text.match(urlRegex) || [];
  return matches.map(url => url.replace(/[\)\]\.,;!?]+$/, ""));
}

function truncate(text: string, length = 100): string {
  if (text.length <= length) return text;
  return `${text.slice(0, length - 1).trim()}…`;
}

function parseDate(dateStr: string): Date {
  // Twitter format: "Mon Jan 05 17:11:54 +0000 2026"
  return new Date(dateStr);
}

type Bookmark = {
  id: string;
  text: string;
  createdAt: string;
  author: {
    username: string;
    name: string;
  };
  likeCount: number;
  retweetCount: number;
  replyCount: number;
};

async function fetchAllBookmarksToFile(outputPath: string): Promise<void> {
  console.log("📥 Fetching all bookmarks from X...");
  
  return new Promise((resolve, reject) => {
    const output = fsSync.openSync(outputPath, 'w');
    const bird = spawn("bird", ["bookmarks", "--all", "--max-pages", "10", "--json"], {
      stdio: ["pipe", output, "pipe"]
    });
    
    let stderr = "";
    
    if (bird.stderr) {
      bird.stderr.on("data", (data) => {
        stderr += data.toString();
      });
    }
    
    bird.on("close", (code) => {
      fsSync.closeSync(output);
      if (code !== 0) {
        reject(new Error(`bird command failed: ${stderr}`));
      } else {
        resolve();
      }
    });
    
    bird.on("error", (error) => {
      fsSync.closeSync(output);
      reject(error);
    });
  });
}

async function loadBookmarksFromFile(filePath: string): Promise<Bookmark[]> {
  const content = await fs.readFile(filePath, "utf-8");
  
  // Remove any warning lines before the JSON
  const lines = content.split('\n');
  let jsonStart = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('[') || line.startsWith('{')) {
      jsonStart = i;
      break;
    }
  }
  
  const jsonContent = lines.slice(jsonStart).join('\n');
  const parsed = JSON.parse(jsonContent);
  
  if (parsed.tweets && Array.isArray(parsed.tweets)) {
    return parsed.tweets;
  }
  
  return parsed;
}

function filterByDate(bookmarks: Bookmark[], startDate: Date): Bookmark[] {
  return bookmarks.filter(b => {
    const bookmarkDate = parseDate(b.createdAt);
    return bookmarkDate >= startDate;
  });
}

function generateSummary(bookmarks: Bookmark[]) {
  // Group by category
  const byCategory: Record<string, Bookmark[]> = {};
  const byAuthor: Record<string, number> = {};
  let totalLikes = 0;
  let totalRetweets = 0;
  
  for (const bookmark of bookmarks) {
    const category = detectCategory(bookmark.text);
    if (!byCategory[category]) {
      byCategory[category] = [];
    }
    byCategory[category].push(bookmark);
    
    const author = bookmark.author.username;
    byAuthor[author] = (byAuthor[author] || 0) + 1;
    
    totalLikes += bookmark.likeCount || 0;
    totalRetweets += bookmark.retweetCount || 0;
  }
  
  // Sort categories by count
  const sortedCategories = Object.entries(byCategory)
    .sort((a, b) => b[1].length - a[1].length);
  
  // Sort authors by count
  const sortedAuthors = Object.entries(byAuthor)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  return {
    total: bookmarks.length,
    byCategory: sortedCategories,
    topAuthors: sortedAuthors,
    totalLikes,
    totalRetweets,
    engagement: totalLikes + totalRetweets
  };
}

function formatReport(summary: any, bookmarks: Bookmark[], startDate: Date): string {
  const dateStr = startDate.toISOString().split('T')[0];
  const now = new Date().toISOString().split('T')[0];
  
  let report = `# X Bookmarks Summary: ${dateStr} to ${now}\n\n`;
  
  report += `## Overview\n\n`;
  report += `- **Total Bookmarks**: ${summary.total}\n`;
  report += `- **Total Likes**: ${summary.totalLikes.toLocaleString()}\n`;
  report += `- **Total Retweets**: ${summary.totalRetweets.toLocaleString()}\n`;
  report += `- **Total Engagement**: ${summary.engagement.toLocaleString()}\n\n`;
  
  report += `## By Category\n\n`;
  for (const [category, items] of summary.byCategory) {
    report += `### ${category} (${items.length})\n\n`;
    for (const item of items.slice(0, 5)) {
      const cleanText = item.text.replace(/https?:\/\/[^\s]+/g, '').trim();
      const preview = truncate(cleanText, 80);
      const urls = extractUrls(item.text);
      const urlStr = urls.length > 0 ? ` [${urls.length} link${urls.length > 1 ? 's' : ''}]` : '';
      report += `- **@${item.author.username}**: ${preview}${urlStr}\n`;
    }
    if (items.length > 5) {
      report += `- ... and ${items.length - 5} more\n`;
    }
    report += `\n`;
  }
  
  report += `## Top Authors\n\n`;
  report += `| Author | Bookmarks |\n`;
  report += `|--------|-----------|\n`;
  for (const [author, count] of summary.topAuthors) {
    report += `| @${author} | ${count} |\n`;
  }
  report += `\n`;
  
  report += `## Notable Links\n\n`;
  const allUrls: string[] = [];
  for (const bookmark of bookmarks) {
    const urls = extractUrls(bookmark.text);
    allUrls.push(...urls);
  }
  
  // Group by domain
  const byDomain: Record<string, string[]> = {};
  for (const url of allUrls) {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      if (!byDomain[domain]) {
        byDomain[domain] = [];
      }
      byDomain[domain].push(url);
    } catch {
      // Invalid URL
    }
  }
  
  const sortedDomains = Object.entries(byDomain)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10);
  
  for (const [domain, urls] of sortedDomains) {
    report += `- **${domain}**: ${urls.length} link${urls.length > 1 ? 's' : ''}\n`;
  }
  
  report += `\n## Recent Highlights\n\n`;
  const sortedByEngagement = [...bookmarks]
    .sort((a, b) => (b.likeCount + b.retweetCount) - (a.likeCount + a.retweetCount))
    .slice(0, 10);
  
  for (const bookmark of sortedByEngagement) {
    const cleanText = bookmark.text.replace(/https?:\/\/[^\s]+/g, '').trim();
    const preview = truncate(cleanText, 120);
    const engagement = bookmark.likeCount + bookmark.retweetCount;
    report += `### @${bookmark.author.username} (${engagement.toLocaleString()} engagement)\n\n`;
    report += `${preview}\n\n`;
    const urls = extractUrls(bookmark.text);
    if (urls.length > 0) {
      report += `Links: ${urls.slice(0, 3).join(', ')}\n\n`;
    }
  }
  
  return report;
}

async function main() {
  const startDate = new Date("2026-01-01T00:00:00Z");
  const tempFile = path.join(os.tmpdir(), `x_bookmarks_${Date.now()}.json`);
  
  try {
    // Fetch to temp file
    await fetchAllBookmarksToFile(tempFile);
    console.log(`✓ Bookmarks saved to temp file`);
    
    // Load and parse
    const allBookmarks = await loadBookmarksFromFile(tempFile);
    console.log(`📊 Total bookmarks fetched: ${allBookmarks.length}`);
    
    // Filter by date
    const filteredBookmarks = filterByDate(allBookmarks, startDate);
    console.log(`📅 Bookmarks from ${startDate.toISOString().split('T')[0]} onwards: ${filteredBookmarks.length}`);
    
    if (filteredBookmarks.length === 0) {
      console.log("No bookmarks found from the specified date range.");
      return;
    }
    
    // Generate summary
    const summary = generateSummary(filteredBookmarks);
    const report = formatReport(summary, filteredBookmarks, startDate);
    
    // Save report
    const reportPath = path.join(ROOT, "notes", "bookmarks-summary-2026.md");
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, report, "utf-8");
    
    console.log(`\n✅ Summary saved to: ${reportPath}`);
    console.log(`\n📈 Summary:`);
    console.log(`   Total: ${summary.total} bookmarks`);
    console.log(`   Categories: ${summary.byCategory.length}`);
    console.log(`   Engagement: ${summary.engagement.toLocaleString()}`);
    
    // Print preview
    console.log(`\n${"=".repeat(60)}`);
    console.log("PREVIEW:");
    console.log("=".repeat(60));
    console.log(report.split('\n').slice(0, 50).join('\n'));
    console.log("\n... [truncated for display] ...");
    
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    // Cleanup temp file
    try {
      await fs.unlink(tempFile);
    } catch {
      // Ignore cleanup errors
    }
  }
}

main();
