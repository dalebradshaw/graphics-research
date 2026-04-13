# graphics-research

Workspace for two connected lines of work:

1. a corpus/transcript pipeline for graphics research on three.js, React Three Fiber, shaders, and Blender
2. a newer papercraft reverse-engineering and app-design track centered on plotter/cutter-aware media artifacts

The corpus side still matters, but the active product research now lives around papercraft analysis, clean-room converted app structure, and `Media Score Studio`.

## Current workstreams

### Papercraft and fabrication research

This is the most active stream right now.

- `notes/papercraft-research-map-2026-04-10.md` – entry point for the papercraft workstream, reading order, and research backlog
- `notes/papercraft-unfolder-experiment-2026-04-09.md` – first framing note from the Unfolder session
- `notes/papercraft-cube-fixture-research-2026-04-10.md` – first fixture-grade rule set for the cube
- `notes/pepakura-research-run-2026-04-10.md` – local package and official-site research pass on Pepakura
- `notes/pepakura-static-analysis-2026-04-10.md` – deeper binary-oriented Pepakura findings
- `unfolder-static-analysis/` – practical static disassembly trail for `/Applications/Unfolder.app`
- `unfolder-converted-base/` – clean-room, human-named converted base derived from the Unfolder analysis
- `pepakura-static-analysis/` – extracted Pepakura payload and static-analysis trail
- `media-score-studio/` – native macOS workstation scaffold that absorbs the research into app structure

### Corpus and transcript tooling

This remains the intake and normalization layer for broader graphics research.

- `corpus/` – canonical dataset (`corpus.json`), generated TypeScript helpers, Markdown knowledge base, and glossary
- `transcripts/` – cleaned transcripts for long-form resources
- `transcripts-raw/` – downloaded caption/source transcript files before cleanup
- `notes/` – research notes, summaries, and local investigation writeups
- `scripts/` – TypeScript and shell CLIs for ingestion, transcript handling, and bookmark processing
- `src/search.ts` – lightweight CLI search over the corpus
- `.github/` – issue templates and Actions for ingestion workflows

### Experiments

- `experiments/` – graphics experiments that are still useful as technical references, but are not the current papercraft focus

## Suggested reading order

If you are continuing the papercraft/app work, read in this order:

1. `notes/papercraft-research-map-2026-04-10.md`
2. `notes/papercraft-unfolder-experiment-2026-04-09.md`
3. `notes/pepakura-research-run-2026-04-10.md`
4. `notes/pepakura-static-analysis-2026-04-10.md`
5. `notes/papercraft-cube-fixture-research-2026-04-10.md`
6. `media-score-studio/Docs/V1-Scope.md`
7. `media-score-studio/Docs/Research-Inputs.md`

## Where to deepen next

The repo has enough high-level understanding already. The places that still need deeper treatment are:

- seam graph algorithms and shortest-path cutline selection
- flap geometry rules and merge behavior
- fixture ladder beyond the cube: tetrahedron, then cylinder
- page layout and packing heuristics
- export semantics for SVG, PDF, and later G-code
- shared geometry kernel concepts that can move from research into the app

Those decisions are captured more explicitly in `notes/papercraft-research-map-2026-04-10.md`.

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

# grab the newest channel uploads (defaults to 10) and ingest transcripts automatically
npm run import:channel -- \
  --url "https://www.youtube.com/@TheDucky3D/videos" \
  --category blender \
  --tags "blender,geometry-nodes" \
  --limit 10

# finish missing transcripts manually (placeholder lives in transcripts/<id>.md)
npx tsx scripts/add-youtube-transcript.ts --url "https://www.youtube.com/watch?v=<id>" --title "..." --category blender --tags "needs-transcript" --transcriptFile path/to/captions.txt --build

# quick search
echo "tsl" | npm run search -- --tag tsl
npm run search -- "geometry nodes"
```

### Script behaviour highlights
- Scripts accept `--summaryFile` / `--transcriptFile` / `--readmeFile` so large content can be stored in temporary files.
- Auto-tagging heuristics look for common graphics keywords (three.js, R3F, shaders, Blender, instancing, WebGPU) and merge with any tags you pass in.
- `--build` triggers `scripts/build-md.ts`, rebuilding both `corpus.md` and `corpus.ts` so everything stays consistent.
- Missing captions are tracked automatically: entries get the `needs-transcript` tag and the transcript Markdown includes a placeholder so you can drop in text later.

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
