---
title: Papercraft Seam Graph Algorithms
tags:
  - papercraft
  - algorithms
  - reverse-engineering
  - media-score-studio
aliases:
  - Seam Graph Algorithms
---

# Papercraft Seam Graph Algorithms

## Scope

This note consolidates the seam-graph logic implied by the Unfolder and Pepakura research into one implementation-oriented model.

It is not recovered source code. It is a practical algorithm note derived from:

- [[papercraft-unfolder-experiment-2026-04-09]]
- [[pepakura-research-run-2026-04-10]]
- [[pepakura-static-analysis-2026-04-10]]
- `/Users/dalebradshaw/graphics_research/unfolder-static-analysis/51-papercraft-kernel-pipeline.md`
- `/Users/dalebradshaw/graphics_research/unfolder-static-analysis/61-papercraft-kernel-map.md`

## Core idea

Papercraft unfolding should be treated as graph editing over mesh adjacency, not as a one-shot flatten command.

The useful abstraction is:

- faces are graph nodes
- shared edges are graph edges
- each shared edge carries papercraft state
- connected components of joined edges become parts
- open edges define cut boundaries and seam opportunities

## Minimal data model

### Mesh layer

- `Vertex`
- `HalfEdge` or equivalent indexed edge representation
- `Face`
- `FaceNormal`

### Seam graph layer

- `FaceAdjacencyEdge`
  - `faceA`
  - `faceB`
  - `meshEdge`
  - `state`
  - `foldAngle`
  - `joinID?`
  - `flags`

### Edge state

The strongest working set is:

- `joined`
- `open`
- `boundary`
- `unjoinable`
- `suppressed`

Interpretation:

- `joined`: faces remain in the same flattened part
- `open`: the shared edge becomes a cut or seam boundary
- `boundary`: original mesh border, not a join candidate
- `unjoinable`: topology or geometry blocks a valid join
- `suppressed`: optional hidden/flat display state, not a topology change

## Build step

### 1. Build face adjacency

For each manifold mesh edge shared by exactly two faces:

- compute oriented adjacency
- compute dihedral or fold angle
- create one seam-graph edge

For edges with only one incident face:

- mark as `boundary`

For non-manifold cases:

- mark connected incident relationships as `unjoinable`
- surface them in diagnostics

### 2. Seed initial seam state

The research strongly suggests two initial modes:

- all candidate edges start `joined`, then are opened by cutline selection
- or auto-unfold heuristics produce an initial open-edge set, then the user edits it

For our app, the cleaner first implementation is:

- start from a fixture-defined seam state
- then support edits on top of that

## Main operations

### Open edge

Operation:

- change one adjacency edge from `joined` to `open`

Effect:

- may split one connected component into two parts
- creates new perimeter in the flattened layout
- may create eligibility for seam tabs later

### Join edge

Operation:

- change one adjacency edge from `open` to `joined`

Preconditions:

- edge is not `boundary`
- edge is not `unjoinable`
- resulting part does not violate app-specific geometric constraints

Effect:

- may merge two parts into one
- removes a cut boundary
- may invalidate seam-tab placement on that edge

### Separate all faces

Operation:

- set every candidate adjacency edge to `open`

Use:

- reset into the maximal cut state
- useful as a diagnostic or manual reconstruction base

### Join adjacent isolated edges

Pepakura’s string surface strongly suggests a cleanup operator that reconnects tiny broken regions.

Working interpretation:

- detect edges or tiny face groups whose open-state configuration creates accidental isolation
- join nearby compatible open edges using tolerance and topology checks

For v1 this should be a separate repair pass, not hidden behavior.

## Shortest-path cutline selection

Pepakura explicitly exposes:

- `Pick the Open Edges on the Shortest Path between Two Points`

That is one of the clearest algorithm clues in the research.

### Problem statement

Given two user-selected vertices, edges, or edge-adjacent points on the mesh, find a path across adjacency candidates and set those edges to `open`.

### Useful graph for pathfinding

The cleanest working graph is edge-centric:

- graph nodes are seam-graph edges or mesh vertices
- graph weights penalize bad papercraft cuts

### Reasonable weight terms

Even without recovered source, these weights make sense:

- base traversal cost: `1`
- fold-angle penalty: prefer edges near natural folds
- visibility penalty: avoid paths that cut across prominent front-facing structure
- topology penalty: avoid routing near non-manifold or fragile zones
- flap penalty: avoid cutting edges that already carry important closure semantics

For v1:

- use unweighted or lightly weighted shortest path first
- keep the weight model simple and inspectable

### Pseudocode

```text
function openShortestPath(start, end, seamGraph):
    graph = buildPathGraph(seamGraph)
    path = dijkstra(graph, start, end, cost: edgeCost)
    for each candidate in path:
        if candidate.state is joinable:
            candidate.state = open
    recomputePartsAndLayout()
```

## Part derivation

Once seam states are updated:

1. remove all `open`, `boundary`, and `unjoinable` edges from the join graph
2. compute connected components over remaining `joined` edges
3. each connected component becomes a flattened part candidate

This is the bridge between topological editing and page layout.

## Diagnostics that belong to the seam graph

The reverse-engineering passes point to diagnostics that should be derived directly from seam state:

- unjoined edges
- unjoinable edges
- non-manifold edges
- non-unique IDs
- overflowed parts
- overlapped parts

Useful split:

- topology diagnostics before flattening
- layout diagnostics after flattening

## Relationship to folds

Seam state and fold state should not collapse into one concept.

- seam state answers whether faces remain connected
- fold state answers how connected faces behave when folded

That means an interior joined edge can still carry:

- `mountain`
- `valley`
- `flat`

while an `open` edge cannot be a structural hinge.

## Implementation implications for the app

For `Media Score Studio` or the adjacent papercraft prototype, the seam graph suggests these model-level types:

- `FaceAdjacency`
- `SeamState`
- `FoldPolarity`
- `PartComponent`
- `SeamSelectionOperation`

The first UI operations worth supporting are:

1. open one edge
2. join one edge
3. separate all faces
4. shortest-path open selection
5. highlight unjoinable and non-manifold edges

## Fixture implications

### Cube

- seam graph is trivial and manually specifiable
- use it as the baseline regression case

### Tetrahedron

- validates that non-orthogonal fold angles still work under the same seam model

### Cylinder

- validates segmented curved strips and explicit closure seams

## Strong working rule

The app should never derive cut, fold, and tab behavior directly from raw polygons alone.

It should derive them from:

1. mesh adjacency
2. seam state
3. fold classification
4. fixture or user edit decisions

## Confidence and limits

High confidence:

- seam editing is a primary authoring surface
- shortest-path seam opening is worth supporting
- part derivation depends on connected components after open edges are removed

Lower confidence:

- exact path weighting heuristics
- exact auto-repair behavior for isolated edges
- exact conditions that make an edge `unjoinable`

Those can stay implementation decisions unless stronger evidence becomes necessary.
