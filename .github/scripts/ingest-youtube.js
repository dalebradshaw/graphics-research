#!/usr/bin/env node
import { writeFileSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { execFileSync } from "child_process";

function parseIssue(input) {
  if (!input) throw new Error("ISSUE_JSON payload missing");
  return JSON.parse(input);
}

function parseSections(body) {
  const result = {};
  const regex = /### ([^\n]+)\n\n([\s\S]*?)(?=\n### |$)/g;
  let match;
  while ((match = regex.exec(body)) !== null) {
    const [, heading, value] = match;
    result[heading.trim().toLowerCase()] = value.trim();
  }
  return result;
}

function ensure(value, field) {
  if (!value) throw new Error(`Missing required field: ${field}`);
  return value;
}

function run() {
  const issueJson = process.argv[2];
  const issue = parseIssue(issueJson);
  const sections = parseSections(issue.body || "");

  const url = ensure(sections["video url"], "Video URL");
  const title = ensure(sections["title"], "Title");
  const category = ensure(sections["category"], "Category");
  const tags = (sections["tags"] || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .join(",");
  const summary = sections["summary"] || "";
  const transcript = sections["transcript"] || "";

  const tempDir = mkdtempSync(path.join(tmpdir(), "yt-ingest-"));
  let summaryFile;
  if (summary) {
    summaryFile = path.join(tempDir, "summary.md");
    writeFileSync(summaryFile, summary, "utf-8");
  }
  let transcriptFile;
  if (transcript) {
    transcriptFile = path.join(tempDir, "transcript.md");
    writeFileSync(transcriptFile, transcript, "utf-8");
  }

  const args = ["tsx", "scripts/add-youtube-transcript.ts", "--url", url, "--title", title, "--category", category];
  if (tags) {
    args.push("--tags", tags);
  }
  if (summaryFile) {
    args.push("--summaryFile", summaryFile);
  } else if (summary) {
    args.push("--summary", summary);
  }
  if (transcriptFile) {
    args.push("--transcriptFile", transcriptFile);
  }
  args.push("--createdAt", issue.created_at);

  execFileSync("npx", args, { stdio: "inherit" });
}

run();
