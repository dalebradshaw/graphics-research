# graphics-research

Corpus for graphics research on three.js, React Three Fiber, shaders, and Blender. Bookmarks, tutorials, transcripts, and supporting notes are normalised into TypeScript + Markdown so they can power future tooling, documentation, and search.

## Project layout
- `corpus/` – canonical dataset (`corpus.json`), generated TypeScript helpers, Markdown knowledge base, and evolving glossary.
- `transcripts/` – cleaned transcripts for long-form resources (YouTube talks, tutorials, etc.).
- `notes/` – optional README or documentation snapshots for GitHub resources.
- `scripts/` – TypeScript CLIs to ingest exports from X, YouTube transcripts, and GitHub repos.
- `src/search.ts` – lightweight CLI search over the corpus.
- `.github/` – issue templates + Actions that open pull requests whenever you file an ingestion issue.

## Prerequisites
- Node.js 18+ (workflows use Node 20).
- `npm install` to pull local dependencies (`typescript`, `tsx`).

## Local commands
```bash
# regenerate corpus.md + corpus.ts from corpus.json
npm run build:md

# ingest an X Bookmarks Exporter JSON (defaults to data/XBookmarksExporter.json)
npm run add:x -- --input path/to/export.json --build

# add a YouTube transcript (stdin or --transcriptFile)
pbpaste | npm run add:yt -- \
  --url "https://www.youtube.com/watch?v=t61gMdBXjQw" \
  --title "Parasite effect with Geometry Nodes" \
  --category blender \
  --tags "blender,geometry-nodes,looping" \
  --summary "Loopable parasite volume built with Geometry Nodes." \
  --build

# add a GitHub resource (optionally pipe README text)
pbpaste | npm run add:gh -- \
  --url "https://github.com/owner/repo" \
  --title "R3F Instancing Patterns" \
  --category threejs \
  --tags "threejs,react-three-fiber,instancing" \
  --summary "Instanced meshes + batching patterns for R3F." \
  --build

# quick search
echo "tsl" | npm run search -- --tag tsl
npm run search -- "geometry nodes"
```

### Script behaviour highlights
- Scripts accept `--summaryFile` / `--transcriptFile` / `--readmeFile` so large content can be stored in temporary files.
- Auto-tagging heuristics look for common graphics keywords (three.js, R3F, shaders, Blender, instancing, WebGPU) and merge with any tags you pass in.
- `--build` triggers `scripts/build-md.ts`, rebuilding both `corpus.md` and `corpus.ts` so everything stays consistent.

## GitHub automation (official workflow)
1. Push this repo to GitHub.
2. Open an issue using one of the provided templates:
   - **Ingest YouTube Transcript** – paste URL, summary, transcript.
   - **Ingest GitHub Resource** – supply repo URL, summary, optional README snippet.
3. Label the issue (`ingest:youtube` or `ingest:github`).
4. The matching GitHub Action will:
   - Parse the issue body via `.github/scripts/ingest-*.js`.
   - Run the corresponding TypeScript ingester.
   - Regenerate the Markdown/TypeScript outputs.
   - Open a pull request (`ingest/<type>-<issue#>`) referencing the original issue.

All workflows rely on first-party GitHub APIs and the official `peter-evans/create-pull-request` action, so no proxies are required.

## Extending
- Add new keyword rules inside `scripts/add-from-x-export.ts` and `scripts/add-github-resource.ts` to improve automatic tagging or categorisation.
- Drop cleaned transcripts into `transcripts/` directly if you have them prepared—rerun `npm run build:md` afterwards to keep derived files current.
- Update `corpus/glossary.md` as new recurring terms appear across bookmarks and tutorials.
