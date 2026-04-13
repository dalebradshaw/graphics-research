---
title: Papercraft Missing Pieces Plan
tags:
  - papercraft
  - backlog
  - implementation
  - planning
aliases:
  - Missing Pieces Plan
---

# Papercraft Missing Pieces Plan

## Why this note exists

The first pass is real now. That changes the question from “what should we learn?” to “what is the shortest path from the cube prototype to a useful papercraft tool?”

This note is the ordered backlog for that transition.

## Current base

Already implemented:

- first-pass seam and flap model
- cube fixture semantics
- 2D semantic rendering for the cube
- USDZ orbit + zoom inspection path

Reference:

- [[papercraft-first-pass-implementation-2026-04-10]]

## Ordered next steps

### 1. Export semantics note

Write the missing note:

- `papercraft-export-semantics`

It should lock:

- layer names
- cut / fold / tab-fold / registration / annotation output conventions
- page-space units
- stroke policies
- SVG and PDF mapping
- future G-code assumptions

Why first:

- serializers should not invent semantics

### 2. SVG export for the cube

Implement:

- one serializer over `PapercraftLayoutModel`
- file output for the cube fixture

Why second:

- it proves the model is not just a renderer input

### 3. Tetrahedron fixture

Write the fixture note, then implement it.

Why:

- it is the smallest non-orthogonal validation case
- it tests acute-angle flap and seam behavior without curved-surface complexity

### 4. Cylinder fixture

Write the fixture note, then implement it.

Why:

- it is the first segmented curved proxy
- it tests seam closure strips, alternation, and cap logic

### 5. Page layout model

Write and implement:

- page bounds
- part margins
- registration-mark placement policy
- fit-to-page behavior
- one-sheet versus per-sheet structure

Why:

- export and plotter workflows need stable page coordinates

### 6. Seam editing UI

Implement:

- open edge
- join edge
- separate all faces
- shortest-path open selection later

Why:

- this is where the prototype starts behaving like a papercraft tool instead of a fixture viewer

### 7. Flap parameter controls

Implement:

- flap ownership display
- flap height
- side switching
- fold polarity on tab bases
- merge behavior later

Why:

- the notes are now specific enough to support controlled editing

## Things to defer

Do not pull these forward yet:

- `.pdo` or `.ufd` import
- freeform arbitrary-mesh unfolding
- torus as a “solved” case
- live machine control
- heavy optimization passes before stable fixtures and serializers exist

## Practical sequence

The build sequence should stay strict:

1. export semantics note
2. cube SVG export
3. tetrahedron note + fixture
4. cylinder note + fixture
5. page layout model
6. seam editing UI
7. flap controls

## Success condition for the next phase

The next phase is successful when:

- the cube exports clean SVG/PDF with stable semantics
- tetrahedron and cylinder exist as comparable fixtures
- the app has one canonical layout model shared by renderer and serializer

Until then, the right bias is still toward fixture discipline, not ambitious generalization.
