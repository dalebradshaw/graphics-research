# Experiments

Experiments use the curated corpus as reference material. Each subdirectory captures a focused investigation (e.g., recreating a tutorial, exploring shader techniques, performance tweaks) and links back to the corpus entries and transcripts that informed the work.

## Directory format
- `README.md` – intent, references into `corpus/corpus.json` (by `id`) or transcript files.
- `notes.md` – observations, feedback, follow-ups.
- `src/` – code, notebooks, prototype assets. Add README snippets or inline comments when you deviate from the referenced material.
- `artefacts/` (optional) – renders, screenshots, exports. Use git LFS if binary assets get large.

## Workflow
1. Create a new subdirectory with a date + slug (e.g., `2025-10-02-generative-landscape`).
2. Reference relevant corpus entries by `id` (e.g., `yt-7dm776rZz-s`) in the experiment README.
3. Note transcript status: if a `needs-transcript` tag exists, capture missing text while you work and update the transcript.
4. Record findings in `notes.md`, including feedback loops to share with collaborators or future you.
