---
title: Papercraft Flap Geometry Rules
tags:
  - papercraft
  - geometry
  - fabrication
  - media-score-studio
aliases:
  - Flap Geometry Rules
---

# Papercraft Flap Geometry Rules

## Scope

This note turns the flap-related findings from the Unfolder and Pepakura research into explicit geometry rules.

Primary inputs:

- [[papercraft-unfolder-experiment-2026-04-09]]
- [[pepakura-static-analysis-2026-04-10]]
- [[papercraft-cube-fixture-research-2026-04-10]]
- `/Users/dalebradshaw/graphics_research/unfolder-static-analysis/51-papercraft-kernel-pipeline.md`
- `/Users/dalebradshaw/graphics_research/unfolder-static-analysis/61-papercraft-kernel-map.md`

## Core idea

Flaps are not decorations. They are attached fabrication geometry generated from edge semantics.

That means every flap needs:

- a base edge
- an owning face or part
- an outward side
- a fold base
- a cut outline
- optional merge behavior with neighboring flaps

## Eligibility

### A flap may exist only on an eligible edge

Default rule:

- flaps belong on free perimeter edges of the flattened net

That excludes:

- interior hinge edges between connected faces
- edges that are still structurally joined
- edges that are entirely internal to the net

This is the exact rule the box/torus failure exposed. Interior glue tabs are physically wrong because they occupy space where connected paper already exists.

### Special case: seam closure

Some perimeter edges are not generic perimeter. They are closure edges.

That suggests two semantic classes:

- `perimeterFlap`
- `seamFlap`

They may share geometry generation logic, but they should remain distinguishable in the model.

## Ownership

Each flap should be owned by one side of an open seam, not both.

Minimal model:

- `baseEdge`
- `ownerFaceID`
- `targetFaceID?`
- `kind`
- `foldPolarity?`

Why ownership matters:

- only one side should emit the flap polygon
- export and annotation need stable identity
- mirrored duplicate flaps are usually fabrication errors

## Side choice

Pepakura explicitly exposes `Switch Flap Position`.

That means flap side is editable state, not a fixed consequence of topology.

### Practical rule

For an eligible perimeter edge:

- compute the edge direction in page space
- compute the owning face winding
- derive the outward side normal in 2D
- place the flap polygon on that outward side

The user or fixture can override that side if assembly needs a different choice.

## Fold base

The base of the flap is a fold line, not a cut line.

That means each flap produces at least two semantics:

- `tab-fold`: the base segment shared with the owner face
- `cut`: the outer tab outline

This distinction should survive all serializers.

## Parameters implied by research

Pepakura exposes:

- `dDefaultFlapHeightMM`
- `iMaxFlapBaseAngle`
- `iVirtualFlapHeightMM`
- `bFlapAlternate`

Unfolder exposes:

- flap shape control
- left and right flap angle fields
- flap height field
- copy, paste, and mirror flap shape actions
- optimization by expected height, expected angle, and tolerance

Working parameter set:

- `height`
- `leftAngle`
- `rightAngle`
- `maxBaseAngle`
- `virtualHeight`
- `alternationMode`

## Base geometry

The simplest useful flap is a tapered quadrilateral or trapezoid attached to one edge.

### Inputs

- base edge endpoints `p0`, `p1`
- outward normal `n`
- height `h`
- taper derived from left and right angles

### Construction

1. take the base edge from `p0` to `p1`
2. offset outward by `h`
3. trim the two offset corners according to left/right angles
4. produce polygon:
   - `p0`
   - `p1`
   - `q1`
   - `q0`

### Why this is the right default

- it aligns exactly with the owning edge
- it produces a cuttable outline
- it supports asymmetric taper
- it matches the control surface implied by the recovered apps

## Triangle versus trapezoid behavior

A useful practical split:

- short edges or tight corners may prefer triangular or heavily tapered flaps
- long straight edges usually prefer trapezoidal flaps

For v1:

- use trapezoid-style generation as the default
- allow aggressive taper when corner collisions demand it

## Merge rules

Both research passes imply real adjacent-flap merging behavior.

### Why merging exists

If two neighboring flaps on adjacent perimeter edges overlap or create a tiny wedge between them:

- the net becomes awkward to cut
- glue surfaces become unreliable
- cutter output gets noisy

### Basic merge policy

Two adjacent flaps are mergeable when:

- their base edges share a vertex
- both belong to the same owner face
- their outward sides are compatible
- the union polygon is simpler than the separate result

### Result of merge

- replace two flap polygons with one merged polygon
- preserve the individual base fold segments, or represent the merged fold base as two collinear/subdivided segments

For the first implementation:

- keep base fold segments explicit
- merge only the cut outline

## Alternation

`bFlapAlternate` strongly suggests the apps support alternating flap placement to avoid dense collisions.

Useful interpretation:

- along a run of eligible edges, alternate flap ownership or side choice when that reduces interference

This is especially relevant for segmented curved proxies like cylinders.

For v1:

- treat alternation as a fixture-level or generator-level option, not an always-on heuristic

## Fold polarity

Pepakura exposes:

- `Add a Flap (with Mountain Fold)`
- `Add a Flap (with Valley Fold)`
- `Add a Flap (without Fold)`

This suggests the flap base may carry its own fold semantics.

Useful model:

- `mountain`
- `valley`
- `none`

In many cutter workflows this affects:

- score styling
- dashed versus solid fold rendering
- how assembly instructions describe the step

## Optimization

Unfolder’s dedicated flap optimizer implies flap generation is followed by cleanup, not assumed perfect on first construction.

### What optimization should try to improve

- height regularity
- angle regularity
- corner collision avoidance
- avoidance of page overflow
- readability and cutability

### Optimization should not do

- silently move flaps onto interior edges
- destroy ownership identity
- blur the distinction between fold base and cut outline

## Relationship to fixtures

### Cube

Rules that should stay locked:

- tabs only on free perimeter edges
- one explicit seam-flap class for closure
- no flap on structural interior hinges

### Tetrahedron

New thing to validate:

- corner crowding and merge/taper behavior on acute angles

### Cylinder

New things to validate:

- flap alternation on repeated segments
- seam closure strip behavior
- cap attachment strategy

## Serializer implications

Every flap should be serializable as:

- one base fold segment
- one cut polygon outline
- one ownership identity
- optional annotation or target relationship

That should feed:

- SVG
- PDF
- later G-code or cutter-specific adapters

without re-deriving geometry inside the serializer.

## Recommended app model

Minimal types worth introducing:

- `FlapKind`
- `FlapAttachment`
- `FlapPolygon`
- `FlapParameters`
- `FlapMergeGroup`

Useful fields:

- `id`
- `baseEdgeID`
- `ownerFaceID`
- `targetFaceID?`
- `kind`
- `height`
- `leftAngle`
- `rightAngle`
- `foldPolarity`
- `polygon`

## Strong working rules

1. A flap must align exactly to one eligible edge.
2. A flap base is always a fold semantic, never just another cut edge.
3. Flaps belong on perimeter edges, not on interior hinge lines.
4. Flap ownership must be explicit.
5. Merge behavior belongs in the layout model, not only in export code.

## Confidence and limits

High confidence:

- flap side, height, angle, and merge behavior are first-class concerns
- flaps need their own geometry model
- perimeter-only placement should be a hard constraint

Lower confidence:

- the exact formula used by Pepakura or Unfolder for taper and merge thresholds
- how their optimizers trade off collision versus regularity

Those details can be implementation choices as long as the semantic rules stay intact.
