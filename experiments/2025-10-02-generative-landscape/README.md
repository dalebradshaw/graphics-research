# Generative Landscape Recreation (2025-10-02)

## Goal
Recreate and extend the "Powerful Generative Landscape Animations" workflow (corpus id `yt-7dm776rZz-s`) using the curated transcript and notes. Capture deviations, performance tweaks, and shader variations that could influence future graphics experiments.

## References
- Corpus entry: `yt-7dm776rZz-s` (Blender / Geometry Nodes)
- Transcript: `transcripts/7dm776rZz-s.md`
- Related tutorials for light trails / shading (`yt-SerF_8yCVDA`, `yt-syfDKEpSf54`) for complementary techniques.

## Plan
1. Implement base geometry node setup following the transcript steps.
2. Swap noise parameters and explore alternative looping strategies.
3. Extend shading with color ramp variations and emissive tweaks inspired by the light trail tutorial.
4. Document render performance and visual results in `artefacts/` with screenshots/renders.

## Tooling scaffold
- `threejs-app/` – Vite + Three.js playground for shader + terrain iterations (`npm install && npm run dev`).
- `r3f-app/` – React + React Three Fiber scene shell for UI-driven experiments (`npm install && npm run dev`).
- `blender/` – MCP export workflow notes + scripts for sending geometry/material data into web experiments.

Sync assets via `blender/export` → `threejs-app/public/assets` (see `blender/README.md`).
