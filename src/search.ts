import { promises as fs } from "fs";
import path from "path";

const CORPUS_JSON_PATH = path.join(process.cwd(), "corpus", "corpus.json");

interface Entry {
  id: string;
  category: string;
  title: string;
  description: string;
  urls: Record<string, string | undefined>;
  tags: string[];
  createdAt?: string;
  summary?: string;
}

type Corpus = Entry[];

type Options = {
  tag?: string;
  category?: string;
  query?: string;
};

function parseArgs(): Options {
  const args = process.argv.slice(2);
  const opts: Options = {};
  const rest: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--tag") {
      opts.tag = args[i + 1]?.toLowerCase();
      i += 1;
      continue;
    }
    if (arg === "--category") {
      opts.category = args[i + 1]?.toLowerCase();
      i += 1;
      continue;
    }
    if (arg.startsWith("--")) continue;
    rest.push(arg);
  }

  if (rest.length) {
    opts.query = rest.join(" ").toLowerCase();
  }
  return opts;
}

function matches(entry: Entry, opts: Options): boolean {
  if (opts.tag) {
    if (!entry.tags.map((tag) => tag.toLowerCase()).includes(opts.tag)) {
      return false;
    }
  }
  if (opts.category) {
    if (entry.category.toLowerCase() !== opts.category) return false;
  }
  if (opts.query) {
    const haystack = [
      entry.title,
      entry.description,
      entry.summary ?? "",
      entry.tags.join(" ")
    ]
      .join(" \n ")
      .toLowerCase();
    if (!haystack.includes(opts.query)) return false;
  }
  return true;
}

function formatEntry(entry: Entry): string {
  const lines: string[] = [];
  lines.push(`${entry.title} [${entry.category}]`);
  lines.push(`  ${entry.description}`);
  if (entry.urls.tweet) lines.push(`  Tweet: ${entry.urls.tweet}`);
  if (entry.urls.code) lines.push(`  Code: ${entry.urls.code}`);
  if (entry.urls.demo) lines.push(`  Demo: ${entry.urls.demo}`);
  if (entry.urls.live) lines.push(`  Live: ${entry.urls.live}`);
  if (entry.urls.video) lines.push(`  Video: ${entry.urls.video}`);
  if (entry.urls.article) lines.push(`  Article: ${entry.urls.article}`);
  if (entry.urls.docs) lines.push(`  Docs: ${entry.urls.docs}`);
  if (entry.urls.transcript) lines.push(`  Transcript: ${entry.urls.transcript}`);
  if (entry.tags.length) lines.push(`  Tags: ${entry.tags.join(", ")}`);
  if (entry.createdAt) lines.push(`  Created: ${entry.createdAt}`);
  return lines.join("\n");
}

async function main() {
  const opts = parseArgs();
  const raw = await fs.readFile(CORPUS_JSON_PATH, "utf-8");
  const corpus: Corpus = JSON.parse(raw);

  const matchesFound = corpus.filter((entry) => matches(entry, opts));

  if (!matchesFound.length) {
    console.log("No entries found for query.");
    return;
  }

  matchesFound.forEach((entry, index) => {
    if (index > 0) console.log("");
    console.log(formatEntry(entry));
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
