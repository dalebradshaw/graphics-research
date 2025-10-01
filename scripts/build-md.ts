import { promises as fs } from "fs";
import path from "path";

const ROOT = process.cwd();
const CORPUS_JSON_PATH = path.join(ROOT, "corpus", "corpus.json");
const CORPUS_MD_PATH = path.join(ROOT, "corpus", "corpus.md");
const CORPUS_TS_PATH = path.join(ROOT, "corpus", "corpus.ts");

const SECTION_ORDER: Array<{
  title: string;
  categories: string[];
}> = [
  { title: "Three.js & WebGL", categories: ["threejs", "webgl"] },
  { title: "React Three Fiber", categories: ["react-three-fiber"] },
  { title: "Shaders & FX", categories: ["shaders"] },
  { title: "Graphics & Animation Resources", categories: ["graphics"] },
  { title: "Blender / Geometry Nodes", categories: ["blender"] },
  { title: "Typography / Design", categories: ["design"] },
  { title: "Workflow / Tooling", categories: ["tooling"] },
  { title: "AI Tools & Dev Utilities", categories: ["ai-tools"] }
];

const CATEGORY_TITLES: Record<string, string> = Object.fromEntries(
  SECTION_ORDER.flatMap((section) =>
    section.categories.map((category) => [category, section.title])
  )
);

interface Entry {
  id: string;
  category: string;
  title: string;
  description: string;
  urls: Record<string, string | undefined>;
  tags: string[];
  createdAt?: string;
  summary?: string;
  notes?: string;
  hasTranscript?: boolean;
}

type Corpus = Entry[];

const LINK_ORDER: Array<{ key: keyof Entry["urls"]; label: string }> = [
  { key: "tweet", label: "Tweet" },
  { key: "demo", label: "Demo" },
  { key: "live", label: "Live" },
  { key: "code", label: "Code" },
  { key: "article", label: "Article" },
  { key: "docs", label: "Docs" },
  { key: "pr", label: "PR" },
  { key: "misc", label: "Misc" },
  { key: "video", label: "Video" },
  { key: "transcript", label: "Transcript" }
];

function sortEntries(entries: Corpus): Corpus {
  return [...entries].sort((a, b) => {
    if (a.createdAt && b.createdAt) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (a.createdAt) return -1;
    if (b.createdAt) return 1;
    return a.title.localeCompare(b.title);
  });
}

function formatEntry(entry: Entry): string {
  const lines: string[] = [];
  lines.push(`- **${entry.title}**  `);
  lines.push(`  ${entry.description.trim()}  `);

  const linkParts: string[] = [];
  for (const { key, label } of LINK_ORDER) {
    const value = entry.urls[key];
    if (!value) continue;
    linkParts.push(`${label}: ${value}`);
  }
  if (linkParts.length) {
    lines.push(`  ${linkParts.join(" · ")}  `);
  }
  if (entry.tags.length) {
    lines.push(`  Tags: ${entry.tags.join(", ")}`);
  }

  return lines.join("\n");
}

function createMarkdown(sections: Array<{ title: string; entries: Entry[] }>): string {
  const parts: string[] = [];
  parts.push("# 🌌 Three.js / React Three Fiber / Graphics Knowledge Base");
  for (const section of sections) {
    if (!section.entries.length) continue;
    parts.push("\n## " + section.title);
    section.entries.forEach((entry) => {
      parts.push(formatEntry(entry));
    });
  }
  parts.push("");
  return parts.join("\n");
}

function createTypeScript(entries: Corpus): string {
  const data = JSON.stringify(entries, null, 2);

  return `export type Category =
  | "threejs"
  | "react-three-fiber"
  | "webgl"
  | "shaders"
  | "graphics"
  | "blender"
  | "design"
  | "tooling"
  | "ai-tools";

export type Urls = {
  tweet?: string;
  demo?: string;
  live?: string;
  code?: string;
  docs?: string;
  article?: string;
  pr?: string;
  misc?: string;
  video?: string;
  transcript?: string;
};

export type Entry = {
  id: string;
  category: Category;
  title: string;
  description: string;
  urls: Urls;
  tags: string[];
  createdAt?: string;
  summary?: string;
  notes?: string;
  hasTranscript?: boolean;
};

export const corpus: Entry[] = ${data};

export const byTag = (tag: string) =>
  corpus.filter((entry) =>
    entry.tags.map((t) => t.toLowerCase()).includes(tag.toLowerCase())
  );

export const byCategory = (category: Category) =>
  corpus.filter((entry) => entry.category === category);
`;
}

async function main() {
  const raw = await fs.readFile(CORPUS_JSON_PATH, "utf-8");
  const entries: Corpus = JSON.parse(raw);
  const sorted = sortEntries(entries);
  const sections = SECTION_ORDER.map((section) => ({
    title: section.title,
    entries: sorted.filter((entry) => section.categories.includes(entry.category))
  }));

  const markdown = createMarkdown(sections);
  const tsSource = createTypeScript(sorted);

  await Promise.all([
    fs.writeFile(CORPUS_MD_PATH, markdown, "utf-8"),
    fs.writeFile(CORPUS_TS_PATH, tsSource, "utf-8")
  ]);

  console.log(`✅ Updated ${path.relative(ROOT, CORPUS_MD_PATH)} and corpus.ts`);
}

main().catch((error) => {
  console.error("Failed to rebuild markdown", error);
  process.exit(1);
});
