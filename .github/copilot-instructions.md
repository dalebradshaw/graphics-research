# Copilot Instructions

This is a **graphics research corpus** for Three.js, React Three Fiber, shaders, and Blender. The project normalizes bookmarks, tutorials, and transcripts into a structured TypeScript/JSON dataset with automated ingestion workflows.

## Core Architecture

**Corpus System**: `corpus/corpus.json` is the canonical dataset. Scripts generate derived files:

- `corpus/corpus.ts` - TypeScript types and data exports
- `corpus/corpus.md` - Human-readable knowledge base
- `transcripts/*.md` - Cleaned video transcripts

**Entry Structure**: Each corpus entry has:

```typescript
{
  id: "yt-<videoId>" | "gh-<owner>-<repo>" | "x-<hash>",
  category: "threejs" | "react-three-fiber" | "shaders" | "blender" | "graphics" | "design" | "tooling" | "ai-tools",
  urls: { video?, repo?, docs?, demo?, live?, article? },
  tags: string[], // Auto-tagged from content + manual tags
  hasTranscript?: boolean
}
```

## Key Workflows

**Always rebuild after changes**: Run `npm run build:md` or add `--build` flag to ingestion scripts to keep `corpus.md` and `corpus.ts` synchronized with `corpus.json`.

**Ingestion Commands**:

```bash
# YouTube transcript with auto-tagging
npm run add:yt -- --url "..." --title "..." --category blender --tags "custom,tags" --build

# GitHub repo (pipe README via pbpaste)
pbpaste | npm run add:gh -- --url "https://github.com/owner/repo" --title "..." --category threejs --build

# Bulk channel import (creates placeholder transcripts with "needs-transcript" tag)
npm run import:channel -- --url "https://www.youtube.com/@channel/videos" --category blender --limit 10
```

**Search**: `npm run search -- "geometry nodes"` or `echo "tsl" | npm run search -- --tag tsl`

## Experiments Structure

`experiments/YYYY-MM-DD-name/` contains focused recreations of corpus techniques:

- `README.md` - Goals, references to corpus entries, implementation plan
- `threejs-app/` - Vanilla Three.js + Vite setup
- `r3f-app/` - React Three Fiber + Vite setup
- `blender/` - Blender files and export workflows
- `artefacts/` - Screenshots, renders, performance notes

Both web apps use standard Vite dev servers (`npm install && npm run dev`).

## Auto-Tagging Heuristics

Scripts automatically detect and add tags based on content analysis:

- **Three.js keywords**: "three.js", "threejs", "webgl" → `threejs` tag
- **R3F patterns**: "react-three-fiber", "r3f", "@react-three" → `react-three-fiber` tag
- **Shader terms**: "glsl", "fragment", "vertex", "shader" → `shaders` tag
- **Blender terms**: "geometry nodes", "blender3d" → `geometrynodes`, `blender3d` tags

Merge auto-detected tags with manual `--tags` parameter.

## GitHub Automation

**Issue Templates**: `.github/ISSUE_TEMPLATE/ingest-*.yml` create structured forms
**Workflows**: Label issues with `ingest:youtube` or `ingest:github` to trigger:

1. Parse issue body via `.github/scripts/ingest-*.js`
2. Run corresponding TypeScript ingester
3. Create PR with `ingest/<type>-<issue#>` branch

## Development Patterns

**TypeScript**: All scripts use `tsx` runner. Module type: ESM.
**File Naming**: IDs follow pattern: `yt-<videoId>`, `gh-<owner>-<repo>`, `x-<hash>`
**Categories**: Fixed set in `scripts/add-github-resource.ts` - validate before adding new ones
**Dependencies**: Minimal - only `youtube-transcript` for data, `tsx`/`typescript` for tooling

## Key Files for Context

- `scripts/add-*.ts` - Ingestion logic and auto-tagging rules
- `scripts/build-md.ts` - Corpus regeneration with category sections
- `src/search.ts` - CLI search implementation
- `corpus/corpus.json` - Single source of truth dataset
