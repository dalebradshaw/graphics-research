# Papercraft Research Map

## Why this note exists

The top-level papercraft notes are already useful, but the repo needed one note that says:

- what is already stable enough to build against
- where the evidence lives
- which topics still need a deeper technical pass
- how the reverse-engineering work should feed the app work

This is that note.

## The current shape of the work

There are four distinct layers in the papercraft stream:

### 1. Orientation notes

These are the fastest way back into the topic:

- `papercraft-unfolder-experiment-2026-04-09.md`
- `papercraft-seam-graph-algorithms-2026-04-10.md`
- `papercraft-flap-geometry-rules-2026-04-10.md`
- `pepakura-research-run-2026-04-10.md`
- `pepakura-static-analysis-2026-04-10.md`
- `papercraft-cube-fixture-research-2026-04-10.md`

### 2. Static reverse-engineering evidence

- `unfolder-static-analysis/`
- `pepakura-static-analysis/`

These folders hold the evidence trail, extracted strings, payloads, and architecture-oriented writeups.

### 3. Clean-room reconstruction

- `unfolder-converted-base/`

This is not production code and not a clone. It is the place where reverse-engineering conclusions were normalized into human-readable subsystems and functions.

### 4. App-directed product work

- `media-score-studio/`

This is where the useful findings should end up as actual product language, geometry semantics, export structures, and workflows.

## What is solid enough now

These conclusions are strong enough to use without another major research loop:

### Papercraft is a staged workflow

Both Unfolder and Pepakura point to the same broad structure:

1. validate or import a mesh
2. define cut/open edges or seam graph structure
3. flatten into parts or a net
4. generate flap geometry
5. arrange parts in page space
6. export fabrication-ready output

### 2D and 3D are synchronized reasoning surfaces

The apps are not treating 2D as a print preview. They treat 3D and 2D as linked editing spaces:

- 3D answers “is this a coherent shell?”
- 2D answers “is this fabricable on paper and on a page?”

### Flaps are real geometry

The reverse-engineering passes both say the same thing:

- flap side matters
- flap angles matter
- flap height matters
- adjacent flap merge rules matter
- flaps belong on perimeter edges, not arbitrary interior edges

### Export semantics are not optional polish

The layout has to carry distinct meanings for:

- cut
- fold
- score
- registration
- annotation

That is already enough to justify the geometry model direction in the app work.

### The fixture ladder is clear

We do not need to guess the order anymore:

1. `Cube`
2. `Tetrahedron`
3. `Cylinder`
4. only then `Sphere` and `Torus`

## Where the research still needs to go deeper

These are the areas where a new note or implementation pass would pay off.

### 1. Seam graph operators

Current note:

- [[papercraft-seam-graph-algorithms-2026-04-10]]

We need a dedicated note that turns the reverse-engineering findings into a reusable algorithm description:

- face adjacency graph
- open versus closed edge states
- shortest-path seam selection
- local seam edits
- topology repair such as joining nearby isolated edges

Why it matters:

- this is the real control surface for unfolding
- it will shape both the app model and the fixture tools

### 2. Flap geometry rules

Current note:

- [[papercraft-flap-geometry-rules-2026-04-10]]

We have enough to say that flaps matter, but not yet enough in one place to implement them cleanly across fixtures.

That note should cover:

- base edge ownership
- outward normal and side choice
- flap height and angle parameters
- trapezoid versus triangular taper rules
- merge behavior for adjacent flaps
- cut outline versus fold base treatment

Why it matters:

- the box already exposed how easy it is to draw physically impossible tabs

### 3. Fixture-grade net definitions

The cube is only the first solved case. We need one fixture note per shape when a shape becomes trustworthy:

- tetrahedron
- cylinder

Each fixture note should lock:

- source mesh assumptions
- expected face count and adjacency
- canonical net
- fold edges
- cut edges
- seam closure logic
- tab policy
- registration mark placement

Why it matters:

- these fixtures become the regression corpus for export and rendering

### 4. Page layout and packing

We know layout is a second stage, but we do not yet have a good note on the problem itself.

That deeper note should cover:

- page margins
- part margins
- rotation allowances
- fit-to-page scaling
- single-sheet versus per-sheet outputs
- keeping registration marks stable

Why it matters:

- export serializers will need a page model, not just a net model

### 5. Export serializers and machine semantics

We have enough evidence that SVG, PDF, and later machine-specific output should all share one geometry source.

What still needs fleshing out:

- layer naming and grouping
- dashed versus solid line conventions
- score depth or score color semantics
- page-space coordinate system
- stroke width policy
- G-code mapping assumptions for pen versus cutter workflows

Why it matters:

- if this is under-specified, each exporter becomes its own inconsistent drawing engine

### 6. Document formats, only if they earn their keep

There is still some curiosity value in `.pdo` and `.ufd`, but this is not a v1 blocker.

Only deepen this if we need:

- import compatibility
- better confidence about document state structure
- migration clues for our own document design

Otherwise:

- treat them as useful context, not a primary implementation dependency

## What should feed directly into the app

The app should absorb the research in this order:

1. fixture-backed geometry types
2. seam and fold vocabulary in the inspector and model
3. export-ready layout primitives
4. 2D and 3D synchronized views
5. only then more advanced automation or import paths

## Concrete next notes worth writing

If we keep building the corpus of techniques, the highest-value missing notes are:

1. `papercraft-tetrahedron-fixture`
2. `papercraft-cylinder-fixture`
3. `papercraft-export-semantics`
4. `papercraft-page-layout-model`

## Bottom line

The repo does not need more broad orientation. It needs fewer vague notes and more fixture-grade technical notes around:

- seam graph logic
- flap geometry
- export semantics
- the next two fixtures

That is the shortest path from research to usable app code.
