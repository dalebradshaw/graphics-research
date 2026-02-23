import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type Category =
  | "threejs"
  | "react-three-fiber"
  | "webgl"
  | "shaders"
  | "graphics"
  | "blender"
  | "design"
  | "tooling"
  | "ai-tools";

type Urls = {
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

type Entry = {
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

// New/enhanced graphics entries
const newEntries: Entry[] = [
  {
    id: "2016672171288846362",
    category: "threejs",
    title: "Three.js Daily Challenge - Interactive WebGL Demo",
    description: "A creative coding challenge demonstrating interactive 3D elements using Three.js and React Three Fiber",
    urls: {
      tweet: "https://x.com/mlperego/status/2016672171288846362",
      code: "https://github.com/emmelleppi/threejs-challenge-0",
      live: "https://threejs-challenge-0.netlify.app/"
    },
    tags: ["threejs", "r3f", "webgl", "interactive", "demo", "challenge"],
    createdAt: "2026-01-29T00:38:08.000Z"
  },
  {
    id: "2016119000095469676",
    category: "threejs",
    title: "Three.js Resources - 3D Web Showcase",
    description: "Collection of websites demonstrating how interactive 3D elements elevate storytelling and user experience",
    urls: {
      tweet: "https://x.com/threejsresource/status/2016119000095469676",
      live: "https://threejsresources.com/showcase",
      article: "https://threejsresources.com/"
    },
    tags: ["threejs", "webgl", "webgpu", "showcase", "resources"],
    createdAt: "2026-01-27T12:00:01.000Z"
  },
  {
    id: "2015719730007490923",
    category: "threejs",
    title: "Ferrofluid Audio Visualizer",
    description: "Real-time audio-reactive ferrofluid simulation using Three.js with microphone input support",
    urls: {
      tweet: "https://x.com/sabosugi/status/2015719730007490923",
      demo: "https://codepen.io/sabosugi/full/XJKeqZj"
    },
    tags: ["threejs", "audio", "visualizer", "webgl", "interactive", "simulation"],
    createdAt: "2026-01-26T09:33:28.000Z"
  },
  {
    id: "2015696442539868272",
    category: "threejs",
    title: "Gaussian Splat Lab - Post-processing and VFX",
    description: "Web-based gaussian splatting laboratory for post-processing effects and particle VFX using Spark/Three.js",
    urls: {
      tweet: "https://x.com/XRarchitect/status/2015696442539868272",
      live: "https://gaussian-splat-lab-cdzd.bolt.host"
    },
    tags: ["threejs", "gaussian-splat", "vfx", "particles", "post-processing", "webgl"],
    createdAt: "2026-01-26T08:00:56.000Z"
  },
  {
    id: "2013794741092233539",
    category: "threejs",
    title: "Spatial Sampling and Volumetric Trails",
    description: "Exploring spatial sampling techniques and volumetric trail effects in the browser using Three.js with TSL",
    urls: {
      tweet: "https://x.com/separ8/status/2013794741092233539",
      live: "https://gemini.google.com/share/bdda48404825"
    },
    tags: ["threejs", "volumetric", "trails", "tsl", "webgl", "spatial"],
    createdAt: "2026-01-21T02:04:15.000Z"
  },
  {
    id: "2013463029464342835",
    category: "design",
    title: "Design Engineer Resources Collection",
    description: "Curated collection of the most valuable learning resources for design engineers in 2026",
    urls: {
      tweet: "https://x.com/zayn_harris_dev/status/2013463029464342835",
      misc: "https://devouringdetails.com/",
      live: "https://animations.dev/",
      docs: "https://www.svg.guide/",
      article: "https://www.interfacecraft.dev/",
      code: "https://www.userinterface.wiki/"
    },
    tags: ["design", "animation", "ui", "resources", "learning"],
    createdAt: "2026-01-20T04:06:09.000Z"
  }
];

function updateCorpus() {
  const corpusJsonPath = path.join(__dirname, '..', 'corpus', 'corpus.json');
  const corpusTsPath = path.join(__dirname, '..', 'corpus', 'corpus.ts');

  // Read existing JSON
  const jsonContent = fs.readFileSync(corpusJsonPath, 'utf-8');
  const existingEntries: Entry[] = JSON.parse(jsonContent);

  // Create a map of existing entries by ID
  const entryMap = new Map<string, Entry>();
  existingEntries.forEach(entry => {
    entryMap.set(entry.id, entry);
  });

  // Track updates
  let added = 0;
  let updated = 0;
  let skipped = 0;

  // Process new entries
  newEntries.forEach(newEntry => {
    const existing = entryMap.get(newEntry.id);
    
    if (existing) {
      // Entry exists - update it with enhanced data
      console.log(`Updating entry ${newEntry.id}: ${newEntry.title}`);
      
      // Preserve original createdAt if it exists and is different
      const createdAt = existing.createdAt || newEntry.createdAt;
      
      // Merge URLs - keep existing ones and add new ones
      const mergedUrls: Urls = {
        ...existing.urls,
        ...newEntry.urls
      };
      
      // If the existing entry has a tweet URL and new one doesn't, keep it
      if (existing.urls.tweet && !newEntry.urls.tweet) {
        mergedUrls.tweet = existing.urls.tweet;
      }

      // Update the entry
      const updatedEntry: Entry = {
        ...existing,
        category: newEntry.category,
        title: newEntry.title,
        description: newEntry.description,
        urls: mergedUrls,
        tags: newEntry.tags,
        createdAt: createdAt
      };

      entryMap.set(newEntry.id, updatedEntry);
      updated++;
    } else {
      // Entry doesn't exist - add it
      console.log(`Adding new entry ${newEntry.id}: ${newEntry.title}`);
      entryMap.set(newEntry.id, newEntry);
      added++;
    }
  });

  // Convert map back to array and sort by date (newest first)
  const allEntries = Array.from(entryMap.values());
  allEntries.sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  // Write to JSON file
  fs.writeFileSync(corpusJsonPath, JSON.stringify(allEntries, null, 2));
  console.log(`\nWritten ${allEntries.length} entries to corpus.json`);
  console.log(`  Added: ${added}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped (existing): ${skipped}`);

  // Generate TypeScript file content
  const tsContent = generateTsContent(allEntries);
  fs.writeFileSync(corpusTsPath, tsContent);
  console.log(`Written ${allEntries.length} entries to corpus.ts`);
}

function generateTsContent(entries: Entry[]): string {
  const lines: string[] = [];
  
  lines.push('export type Category =');
  lines.push('  | "threejs"');
  lines.push('  | "react-three-fiber"');
  lines.push('  | "webgl"');
  lines.push('  | "shaders"');
  lines.push('  | "graphics"');
  lines.push('  | "blender"');
  lines.push('  | "design"');
  lines.push('  | "tooling"');
  lines.push('  | "ai-tools";');
  lines.push('');
  lines.push('export type Urls = {');
  lines.push('  tweet?: string;');
  lines.push('  demo?: string;');
  lines.push('  live?: string;');
  lines.push('  code?: string;');
  lines.push('  docs?: string;');
  lines.push('  article?: string;');
  lines.push('  pr?: string;');
  lines.push('  misc?: string;');
  lines.push('  video?: string;');
  lines.push('  transcript?: string;');
  lines.push('};');
  lines.push('');
  lines.push('export type Entry = {');
  lines.push('  id: string;');
  lines.push('  category: Category;');
  lines.push('  title: string;');
  lines.push('  description: string;');
  lines.push('  urls: Urls;');
  lines.push('  tags: string[];');
  lines.push('  createdAt?: string;');
  lines.push('  summary?: string;');
  lines.push('  notes?: string;');
  lines.push('  hasTranscript?: boolean;');
  lines.push('};');
  lines.push('');
  lines.push('export const corpus: Entry[] = [');

  entries.forEach((entry, index) => {
    lines.push('  {');
    lines.push(`    "id": ${JSON.stringify(entry.id)},`);
    lines.push(`    "category": ${JSON.stringify(entry.category)},`);
    lines.push(`    "title": ${JSON.stringify(entry.title)},`);
    lines.push(`    "description": ${JSON.stringify(entry.description)},`);
    
    // URLs
    lines.push('    "urls": {');
    const urlKeys = Object.keys(entry.urls) as (keyof Urls)[];
    urlKeys.forEach((key, urlIndex) => {
      const value = entry.urls[key];
      if (value) {
        const isLast = urlIndex === urlKeys.length - 1;
        lines.push(`      "${key}": ${JSON.stringify(value)}${isLast ? '' : ','}`);
      }
    });
    lines.push('    },');
    
    // Tags
    lines.push('    "tags": [');
    entry.tags.forEach((tag, tagIndex) => {
      const isLast = tagIndex === entry.tags.length - 1;
      lines.push(`      ${JSON.stringify(tag)}${isLast ? '' : ','}`);
    });
    lines.push('    ],');
    
    // Optional fields
    if (entry.createdAt) {
      lines.push(`    "createdAt": ${JSON.stringify(entry.createdAt)},`);
    }
    if (entry.summary) {
      lines.push(`    "summary": ${JSON.stringify(entry.summary)},`);
    }
    if (entry.notes) {
      lines.push(`    "notes": ${JSON.stringify(entry.notes)},`);
    }
    if (entry.hasTranscript !== undefined) {
      lines.push(`    "hasTranscript": ${entry.hasTranscript},`);
    }
    
    const isLastEntry = index === entries.length - 1;
    lines.push(`  }${isLastEntry ? '' : ','}`);
  });

  lines.push('];');
  lines.push('');
  
  return lines.join('\n');
}

// Run the update
updateCorpus();
